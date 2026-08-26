import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Lock, Mail, AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import './Login.css';

const PRESET_USERS = [
  {
    email: 'admin@bhojansetu.org',
    password: 'Password@123',
    name: 'Elena Rostova',
    role: 'admin',
    organization: 'Central Command'
  },
  {
    email: 'donor@bhojansetu.org',
    password: 'Password@123',
    name: 'Marco Bellini',
    role: 'donor',
    organization: 'Annapurna Kitchen'
  },
  {
    email: 'driver@bhojansetu.org',
    password: 'Password@123',
    name: 'Marcus Vance',
    role: 'logistics',
    organization: 'Express Fleet'
  },
  {
    email: 'ngo@bhojansetu.org',
    password: 'Password@123',
    name: 'Sarah Jenkins',
    role: 'ngo',
    organization: 'Hope Haven Shelter'
  }
];

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('donor');
  const [organization, setOrganization] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isRegisterMode) {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              organization: organization
            }
          }
        });

        if (signUpError) throw signUpError;

        // Ensure row exists in profiles table
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            role: role,
            organization: organization
          });
        }

        setSuccessMsg('Account registered successfully! Signing in...');
        
        // Auto-login newly registered user
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (signInData?.user) {
          onLoginSuccess({
            id: signInData.user.id,
            email: signInData.user.email,
            name: fullName,
            role: role.toUpperCase(),
            organization: organization
          });
        } else {
          setIsRegisterMode(false);
        }
      } else {
        // Sign In Flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (signInError) throw signInError;

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        onLoginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: profile?.full_name || data.user.user_metadata?.full_name || 'BhojanSetu Member',
          role: (profile?.role || data.user.user_metadata?.role || 'admin').toUpperCase(),
          organization: profile?.organization || data.user.user_metadata?.organization || 'Central Ops'
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

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: preset.email,
      password: preset.password
    });

    if (signInError) {
      // Auto register if account does not exist
      const { data: signUpData, error: regError } = await supabase.auth.signUp({
        email: preset.email,
        password: preset.password,
        options: {
          data: {
            full_name: preset.name,
            role: preset.role,
            organization: preset.organization
          }
        }
      });

      if (!regError && signUpData?.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: preset.email,
          full_name: preset.name,
          role: preset.role,
          organization: preset.organization
        });

        onLoginSuccess({
          id: signUpData.user.id,
          email: preset.email,
          name: preset.name,
          role: preset.role.toUpperCase(),
          organization: preset.organization
        });
      } else {
        setError(regError?.message || signInError.message);
      }
    } else if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      onLoginSuccess({
        id: data.user.id,
        email: preset.email,
        name: profile?.full_name || preset.name,
        role: (profile?.role || preset.role).toUpperCase(),
        organization: profile?.organization || preset.organization
      });
    }
    setLoading(false);
  };

  return (
    <div className="login-screen-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-badge">
            <Heart className="logo-svg" />
          </div>
          <h1 className="brand-heading">BhojanSetu</h1>
          <p className="brand-tagline">Surplus Food Redistribution Network</p>
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
              <div className="input-group">
                <label>Full Name</label>
                <div className="input-field-wrap">
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-split-row">
                <div className="input-group">
                  <label>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="donor">Donor (Restaurant/Catering)</option>
                    <option value="ngo">NGO (Shelter/Kitchen)</option>
                    <option value="logistics">Logistics Driver</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Hope Shelter"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Work Email</label>
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
              'Create Supabase Account'
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
              ? 'Already have an account? Sign In'
              : "Don't have an account? Register new user in Supabase"}
          </button>
        </div>

        {!isRegisterMode && (
          <div className="quick-access-box">
            <div className="quick-title">
              <KeyRound className="quick-key-icon" /> Seed & Login Supabase Demo Roles:
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