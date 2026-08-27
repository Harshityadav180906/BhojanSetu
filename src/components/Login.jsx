import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Heart, Lock, Mail, AlertCircle, KeyRound, Loader2, 
  User, Phone, MapPin, Building, Crosshair, Camera, 
  Upload, CheckCircle, Truck, X
} from 'lucide-react';
import './Login.css';

const PRESET_USERS = [
  {
    email: 'admin@bhojansetu.org',
    password: 'Password@123',
    name: 'Dr. Elena Rostova',
    role: 'ADMIN',
    organization: 'Central Command HQ',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  },
  {
    email: 'donor@bhojansetu.org',
    password: 'Password@123',
    name: 'Annapurna Caterers',
    role: 'DONOR',
    organization: 'Annapurna Kitchen',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
  },
  {
    email: 'driver@bhojansetu.org',
    password: 'Password@123',
    name: 'Marcus Vance',
    role: 'DRIVER',
    organization: 'Express Fleet 04',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    vehicle_number: 'DL 03 AX 1234'
  },
  {
    email: 'ngo@bhojansetu.org',
    password: 'Password@123',
    name: 'Sister Sarah Jenkins',
    role: 'NGO',
    organization: 'Hope Haven Shelter',
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
  }
];

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Registration Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('DONOR');
  const [organization, setOrganization] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Image Upload / Camera State
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isDriver = role.toUpperCase() === 'DRIVER';

  // Handle Image File Selection / Camera Capture
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result);
      setIsUploadingPhoto(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // Auto-Detect GPS Location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          setAddress(data?.display_name || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setAddress(`GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } finally {
          setIsFetchingLocation(false);
        }
      },
      () => {
        setIsFetchingLocation(false);
        setError('GPS permission denied or unavailable. Enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Mandatory Photo Validation for Drivers
    if (isRegisterMode && isDriver && !photoUrl) {
      setError('Driver verification photo is compulsory. Please take a photo or upload an image.');
      setLoading(false);
      return;
    }

    const defaultPhoto = photoUrl.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName || 'User')}`;
    const normalizedRole = role.toUpperCase();

    try {
      if (isRegisterMode) {
        // 1. Auth Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName,
              name: fullName,
              phone: phone,
              role: normalizedRole,
              organization: organization || 'BhojanSetu Network',
              vehicle_number: isDriver ? vehicleNumber : '',
              address: address,
              latitude: latitude ? String(latitude) : '',
              longitude: longitude ? String(longitude) : '',
              photo_url: defaultPhoto
            }
          }
        });

        if (signUpError) throw signUpError;

        // 2. Direct Fallback Upsert into Profiles Table
        if (data?.user) {
          const profilePayload = {
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            phone: phone,
            role: normalizedRole,
            organization: organization || 'BhojanSetu Network',
            vehicle_number: isDriver ? vehicleNumber : '',
            address: address,
            latitude: latitude,
            longitude: longitude,
            photo_url: defaultPhoto
          };

          await supabase.from('profiles').upsert(profilePayload);

          // If Driver, explicitly save to drivers table
          if (normalizedRole === 'DRIVER') {
            await supabase.from('drivers').upsert({
              id: data.user.id,
              name: fullName,
              email: data.user.email,
              phone: phone,
              vehicle: vehicleNumber || 'Express Fleet EV',
              address: address,
              photo_url: defaultPhoto,
              status: 'Standby / Available',
              battery: '100%',
              capacity: '350 kg'
            });
          }

          // If NGO, save to recipients table
          if (normalizedRole === 'NGO') {
            await supabase.from('recipients').upsert({
              id: data.user.id,
              name: organization || fullName,
              address: address || 'Community Center Point',
              phone: phone || '+91 98000 00000',
              capacity_per_day: 500,
              storage_type: 'Standard Refrigerators',
              verified: true
            });
          }
        }

        setSuccessMsg('Account registered successfully! Signing in...');

        // 3. Auto Sign In
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (signInError) throw signInError;

        if (signInData?.user) {
          onLoginSuccess({
            id: signInData.user.id,
            email: signInData.user.email,
            name: fullName,
            phone: phone,
            role: normalizedRole,
            organization: organization,
            address: address,
            photo_url: defaultPhoto,
            vehicle_number: vehicleNumber
          });
        }
      } else {
        // Standard Sign In
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (signInError) throw signInError;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const userMeta = data.user.user_metadata || {};
        onLoginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: profile?.full_name || profile?.name || userMeta.full_name || userMeta.name || 'BhojanSetu Member',
          phone: profile?.phone || userMeta.phone || '',
          role: (profile?.role || userMeta.role || 'DONOR').toUpperCase(),
          organization: profile?.organization || userMeta.organization || 'Community Hub',
          address: profile?.address || userMeta.address || '',
          photo_url: profile?.photo_url || userMeta.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${data.user.email}`,
          vehicle_number: profile?.vehicle_number || userMeta.vehicle_number || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = async (preset) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: preset.email,
        password: preset.password
      });

      if (signInError) {
        const { data: signUpData, error: regError } = await supabase.auth.signUp({
          email: preset.email,
          password: preset.password,
          options: {
            data: {
              full_name: preset.name,
              name: preset.name,
              role: preset.role,
              organization: preset.organization,
              photo_url: preset.photo_url,
              vehicle_number: preset.vehicle_number || ''
            }
          }
        });

        if (regError) throw regError;

        if (signUpData?.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            email: preset.email,
            full_name: preset.name,
            name: preset.name,
            role: preset.role,
            organization: preset.organization,
            photo_url: preset.photo_url,
            vehicle_number: preset.vehicle_number || ''
          });

          if (preset.role === 'DRIVER') {
            await supabase.from('drivers').upsert({
              id: signUpData.user.id,
              name: preset.name,
              email: preset.email,
              vehicle: preset.vehicle_number || 'Express Unit',
              photo_url: preset.photo_url,
              status: 'Standby / Available'
            });
          }

          onLoginSuccess({
            id: signUpData.user.id,
            email: preset.email,
            name: preset.name,
            role: preset.role.toUpperCase(),
            organization: preset.organization,
            photo_url: preset.photo_url,
            vehicle_number: preset.vehicle_number || ''
          });
        }
      } else if (data?.user) {
        onLoginSuccess({
          id: data.user.id,
          email: preset.email,
          name: preset.name,
          role: preset.role.toUpperCase(),
          organization: preset.organization,
          photo_url: preset.photo_url,
          vehicle_number: preset.vehicle_number || ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-badge">
            <Heart className="logo-svg" />
          </div>
          <h1 className="brand-heading">BhojanSetu</h1>
          <p className="brand-tagline">Surplus Food Redistribution & Tactical Dispatch</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle className="err-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="login-success">
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="login-form">
          {isRegisterMode && (
            <>
              {/* Role Selection */}
              <div className="input-group">
                <label>Register Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="DONOR">Donor (Restaurant, Banquet, Catering)</option>
                  <option value="NGO">NGO (Shelter, Kitchen, Relief Hub)</option>
                  <option value="DRIVER">Driver (Courier / Delivery Partner)</option>
                </select>
              </div>

              {/* Compact Photo Upload / Camera Capture */}
              <div className="input-group">
                <div className="flex items-center justify-between mb-1">
                  <label className="m-0">
                    Profile Photo {isDriver ? <span className="text-red-500 font-bold">* (Compulsory)</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                  </label>
                  {photoUrl && (
                    <button 
                      type="button" 
                      className="text-xs text-red-500 hover:underline flex items-center gap-0.5 border-0 bg-transparent cursor-pointer"
                      onClick={() => setPhotoUrl('')}
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                <div className="compact-photo-row">
                  <div className="compact-avatar-thumb">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Preview" />
                    ) : (
                      <Camera className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="user"
                    onChange={handleImageFileChange}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    className={`btn-compact-upload ${photoUrl ? 'uploaded' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : photoUrl ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="compact-badge-text">Photo Attached</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span className="compact-badge-text">Take Photo / Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Full Name & Mobile */}
              <div className="form-split-row">
                <div className="input-group">
                  <label>Full Name</label>
                  <div className="input-field-wrap">
                    <User className="input-svg" />
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Mobile Number</label>
                  <div className="input-field-wrap">
                    <Phone className="input-svg" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Role-Specific Field */}
              {isDriver ? (
                <div className="input-group">
                  <label>Vehicle Plate Number</label>
                  <div className="input-field-wrap">
                    <Truck className="input-svg" />
                    <input
                      type="text"
                      placeholder="e.g. DL 03 AX 1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <label>Organization / Kitchen Name</label>
                  <div className="input-field-wrap">
                    <Building className="input-svg" />
                    <input
                      type="text"
                      placeholder="e.g. Grand Feast Caterers"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Location with Auto-GPS Button */}
              <div className="input-group">
                <div className="flex items-center justify-between mb-1">
                  <label className="m-0">Operating Address / Location</label>
                  <button 
                    type="button" 
                    className={`btn-auto-gps ${isFetchingLocation ? 'locating' : ''}`}
                    onClick={handleDetectGPS}
                    disabled={isFetchingLocation}
                  >
                    <Crosshair className="gps-crosshair-icon" />
                    <span>{isFetchingLocation ? 'Locating...' : 'Auto-GPS'}</span>
                  </button>
                </div>
                <div className="input-field-wrap">
                  <MapPin className="input-svg" />
                  <input
                    type="text"
                    placeholder="Enter street address or click Auto-GPS"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Email & Password */}
          <div className="input-group">
            <label>Work Email Address</label>
            <div className="input-field-wrap">
              <Mail className="input-svg" />
              <input
                type="email"
                placeholder="name@bhojansetu.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-field-wrap">
              <Lock className="input-svg" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <Loader2 className="spinner" />
            ) : isRegisterMode ? (
              'Create Account'
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="toggle-mode-container">
          <button
            type="button"
            className="toggle-mode-btn"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError('');
              setSuccessMsg('');
            }}
          >
            {isRegisterMode
              ? 'Already registered? Sign In'
              : "Don't have an account? Register new user"}
          </button>
        </div>

        {!isRegisterMode && (
          <div className="quick-access-box">
            <div className="quick-title">
              <KeyRound className="quick-key-icon" /> Quick Demo Role Logins:
            </div>
            <div className="quick-grid">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.role}
                  type="button"
                  className="quick-pill"
                  onClick={() => handlePresetSelect(u)}
                >
                  <span className="pill-role">{u.role}</span>
                  <span className="pill-name">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}