import React, { useState } from 'react';
import { 
  PlusCircle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  PackageCheck, 
  Loader2, 
  Crosshair,
  Phone
} from 'lucide-react';
import { useLiveDonations } from '../hooks/useBhojanData';
import { supabase } from '../supabaseClient';
import './DonorPortal.css';

export default function DonorPortal({ user }) {
  const { donations = [], loading, addDonation } = useLiveDonations();
  const [filterView, setFilterView] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [formData, setFormData] = useState({
    item: '',
    quantity: '',
    type: 'Veg',
    expiryHours: '3',
    location: user?.address || '',
    latitude: null,
    longitude: null,
    storageType: 'Room Temp',
    contactPhone: user?.phone || ''
  });

  // Auto-Detect GPS Location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const detectedAddress = data?.display_name || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

          setFormData((prev) => ({
            ...prev,
            location: detectedAddress,
            latitude: lat,
            longitude: lng
          }));
        } catch {
          setFormData((prev) => ({
            ...prev,
            location: `GPS Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            latitude: lat,
            longitude: lng
          }));
        } finally {
          setIsFetchingLocation(false);
        }
      },
      () => {
        setIsFetchingLocation(false);
        alert('Unable to fetch GPS coordinates. Please enter your location manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item.trim() || !formData.quantity.trim() || !formData.location.trim()) {
      alert('Please fill in all required fields (item, quantity, and location).');
      return;
    }

    try {
      setIsSubmitting(true);

      const donationPayload = {
        donor: user?.organization || user?.name || user?.email?.split('@')[0] || 'Registered Donor',
        contact_phone: formData.contactPhone || user?.phone || 'N/A',
        item: formData.item.trim(),
        quantity: formData.quantity.trim(),
        type: formData.type,
        storage_type: formData.storageType,
        expiry: `${formData.expiryHours} Hours`,
        location: formData.location.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        status: 'Pending Pickup',
        is_urgent: parseFloat(formData.expiryHours) <= 2,
        delivery_otp: String(Math.floor(1000 + Math.random() * 9000))
      };

      // Attempt addDonation via Hook, fallback directly to Supabase client
      if (typeof addDonation === 'function') {
        await addDonation(donationPayload);
      } else {
        const { error } = await supabase.from('donations').insert([donationPayload]);
        if (error) throw error;
      }

      // Reset Form State
      setFormData({
        item: '',
        quantity: '',
        type: 'Veg',
        expiryHours: '3',
        location: user?.address || '',
        latitude: null,
        longitude: null,
        storageType: 'Room Temp',
        contactPhone: user?.phone || ''
      });

      alert('Surplus food reported successfully! Broadcasted to nearby rescue centers.');
    } catch (err) {
      console.error('Donation submission error:', err);
      alert('Failed to report donation: ' + (err.message || 'Database connection error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedDonations = donations.filter((item) => {
    if (filterView === 'MY_POSTS') {
      const activeDonorName = (user?.organization || user?.name || '').toLowerCase();
      return item.donor?.toLowerCase().includes(activeDonorName);
    }
    return true;
  });

  return (
    <div className="donor-workspace">
      {/* Food Surplus Report Form */}
      <div className="donor-form-card">
        <div className="form-top-header">
          <h3 className="form-header-title">
            <PlusCircle className="plus-icon text-emerald-600" /> Report Surplus Food
          </h3>
          <span className="org-badge">
            <ShieldCheck className="shield-icon text-emerald-500" /> Verified Donor
          </span>
        </div>
        <p className="form-author-note">
          Posting as: <strong>{user?.organization || user?.name || 'Registered Kitchen'}</strong>
        </p>

        <form onSubmit={handleSubmit} className="donor-actual-form">
          <div className="form-input-block">
            <label>Dish / Food Description</label>
            <input
              type="text"
              placeholder="e.g. 50 Packs Cooked Rice & Dal"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              required
            />
          </div>

          <div className="form-split-row">
            <div className="form-input-block">
              <label>Quantity / Servings</label>
              <input
                type="text"
                placeholder="e.g. 50 Servings / 25 kg"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="form-input-block">
              <label>Food Category</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Veg">Vegetarian</option>
                <option value="Non-Veg">Non-Vegetarian</option>
                <option value="Raw">Raw Produce</option>
                <option value="Bakery">Bakery / Packaged</option>
              </select>
            </div>
          </div>

          <div className="form-split-row">
            <div className="form-input-block">
              <label>Safe Consumption Window</label>
              <select
                value={formData.expiryHours}
                onChange={(e) => setFormData({ ...formData, expiryHours: e.target.value })}
              >
                <option value="1.5">Under 1.5 Hours (Urgent)</option>
                <option value="3">3 Hours</option>
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
              </select>
            </div>
            <div className="form-input-block">
              <label>Storage Condition</label>
              <select
                value={formData.storageType}
                onChange={(e) => setFormData({ ...formData, storageType: e.target.value })}
              >
                <option value="Room Temp">Ambient / Room Temp</option>
                <option value="Hot Container">Hot Container Kept</option>
                <option value="Chilled">Refrigerated</option>
              </select>
            </div>
          </div>

          <div className="form-input-block">
            <label>Contact Phone</label>
            <div className="input-field-wrap">
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Location with Auto-Detect GPS Button */}
          <div className="form-input-block">
            <div className="flex items-center justify-between mb-1">
              <label className="m-0">Pickup Location & Landmark</label>
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
            <input
              type="text"
              placeholder="e.g. Gate 3, Convention Center, Sector 14"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="submit-donation-btn">
            {isSubmitting ? (
              <>
                <Loader2 className="btn-icon animate-spin" /> Broadcasting...
              </>
            ) : (
              <>
                <PackageCheck className="btn-icon" /> Broadcast to Rescuers
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Stream Feed */}
      <div className="donor-feed-card">
        <div className="feed-header-row">
          <h3 className="feed-title">Active Food Feed</h3>
          <div className="feed-tab-group">
            <button
              className={`feed-tab ${filterView === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterView('ALL')}
            >
              All Streams ({donations.length})
            </button>
            <button
              className={`feed-tab ${filterView === 'MY_POSTS' ? 'active' : ''}`}
              onClick={() => setFilterView('MY_POSTS')}
            >
              My Posts ({displayedDonations.length})
            </button>
          </div>
        </div>

        <div className="feed-cards-grid">
          {loading ? (
            <p className="status-message">Loading real-time donations from Supabase...</p>
          ) : displayedDonations.length === 0 ? (
            <div className="empty-feed-placeholder">
              <AlertCircle className="placeholder-icon" />
              <p>No listings found.</p>
            </div>
          ) : (
            displayedDonations.map((item) => (
              <div key={item.id} className="feed-card">
                <div className="feed-top">
                  <span className={`cat-pill ${item.type?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {item.type}
                  </span>
                  <span className="feed-time">
                    <Clock className="card-inline-icon" /> {item.expiry}
                  </span>
                </div>
                <h4 className="feed-item-title">{item.item}</h4>
                <p className="feed-source">Donor: <strong>{item.donor}</strong></p>
                <p className="feed-location">
                  <MapPin className="card-inline-icon" /> {item.location}
                </p>
                <div className="feed-bottom">
                  <span className="feed-qty">{item.quantity}</span>
                  <span className={`status-tag ${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CheckCircle2 className="card-inline-icon" /> {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}