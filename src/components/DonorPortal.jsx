import React, { useState } from 'react';
import { PlusCircle, MapPin, Clock, ShieldCheck, CheckCircle2, AlertCircle, PackageCheck, Loader2 } from 'lucide-react';
import { useLiveDonations } from '../hooks/useBhojanData';
import './DonorPortal.css';

export default function DonorPortal({ user }) {
  const { donations, loading, addDonation } = useLiveDonations();
  const [filterView, setFilterView] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    quantity: '',
    type: 'Veg',
    expiryHours: '3',
    location: '',
    storageType: 'Room Temp',
    contactPhone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item || !formData.quantity || !formData.location) return;

    try {
      setIsSubmitting(true);
      await addDonation({
        donor: user?.organization || user?.name || 'Registered Donor',
        contact_phone: formData.contactPhone || 'N/A',
        item: formData.item,
        quantity: formData.quantity,
        type: formData.type,
        storage_type: formData.storageType,
        expiry: `${formData.expiryHours} Hours`,
        location: formData.location,
        status: 'Pending Pickup',
        is_urgent: parseFloat(formData.expiryHours) <= 2
      });

      setFormData({
        item: '',
        quantity: '',
        type: 'Veg',
        expiryHours: '3',
        location: '',
        storageType: 'Room Temp',
        contactPhone: ''
      });
    } catch (err) {
      alert('Failed to report donation: ' + (err.message || 'Database error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedDonations = donations.filter((item) => {
    if (filterView === 'MY_POSTS') {
      return item.donor === (user?.organization || user?.name);
    }
    return true;
  });

  return (
    <div className="donor-workspace fade-in">
      {/* Food Surplus Report Form */}
      <div className="donor-form-card">
        <div className="form-top-header">
          <h3 className="form-header-title">
            <PlusCircle className="plus-icon w-5 h-5 text-emerald-600" /> Report Surplus Food
          </h3>
          <span className="org-badge">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified Partner
          </span>
        </div>
        <p className="form-author-note">
          Posting as: <strong>{user?.organization || user?.name || 'General Donor'}</strong>
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
              <label>Quantity</label>
              <input
                type="text"
                placeholder="e.g. 50 Servings"
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
            <label>Pickup Location & Landmark</label>
            <input
              type="text"
              placeholder="e.g. Gate 3, Convention Center"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="submit-donation-btn">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Broadcasting...
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4" /> Broadcast to Rescuers
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Stream Card */}
      <div className="donor-feed-card">
        <div className="feed-header-row">
          <h3 className="feed-title">Active Food Feed</h3>
          <div className="feed-tab-group">
            <button
              className={`feed-tab ${filterView === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterView('ALL')}
            >
              All Streams
            </button>
            <button
              className={`feed-tab ${filterView === 'MY_POSTS' ? 'active' : ''}`}
              onClick={() => setFilterView('MY_POSTS')}
            >
              My Posts
            </button>
          </div>
        </div>

        <div className="feed-cards-grid">
          {loading ? (
            <p className="text-gray-400 p-4">Loading real-time donations from Supabase...</p>
          ) : displayedDonations.length === 0 ? (
            <div className="empty-feed-placeholder">
              <AlertCircle className="w-6 h-6 text-gray-400" />
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
                    <Clock className="w-3.5 h-3.5" /> {item.expiry}
                  </span>
                </div>
                <h4 className="feed-item-title">{item.item}</h4>
                <p className="feed-source">Donor: <strong>{item.donor}</strong></p>
                <p className="feed-location">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" /> {item.location}
                </p>
                <div className="feed-bottom">
                  <span className="feed-qty">{item.quantity}</span>
                  <span className={`status-tag ${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> {item.status}
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