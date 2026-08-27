import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  MapPin, 
  Check, 
  Sparkles,
  KeyRound,
  Search,
  Phone,
  User,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './NgoDashboard.css';

export default function NgoDashboard({ donations = [], updateDonationStatus }) {
  const [recipients, setRecipients] = useState([]);
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [claimModalItem, setClaimModalItem] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState('OPEN_POOL'); // 'OPEN_POOL' | 'INBOUND' | 'HISTORY'
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmPinModal, setConfirmPinModal] = useState(null);
  const [courierProfiles, setCourierProfiles] = useState({});

  // 1. Fetch Verified NGOs & Couriers from Supabase
  useEffect(() => {
    const fetchRecipientsAndDrivers = async () => {
      // Fetch recipient centers
      const { data: ngoData, error: ngoErr } = await supabase.from('recipients').select('*').order('name');
      if (!ngoErr && ngoData && ngoData.length > 0) {
        setRecipients(ngoData);
        setSelectedNgoId(ngoData[0].id);
      } else {
        const fallback = [
          {
            id: 'ngo-1',
            name: 'Hope Haven Shelter',
            capacity_per_day: 450,
            storage_type: 'Refrigerated Vault',
            address: 'Sector 14, Community Center Road',
            phone: '+91 98112 34567',
            pin: '4821'
          },
          {
            id: 'ngo-2',
            name: 'City Care Food Bank',
            capacity_per_day: 800,
            storage_type: 'Ambient / Dry Storage',
            address: 'Gate 2, Ring Road Industrial Area',
            phone: '+91 98223 45678',
            pin: '7394'
          }
        ];
        setRecipients(fallback);
        setSelectedNgoId(fallback[0].id);
      }

      // Fetch driver profiles to populate inbound telemetry dossiers
      const { data: driverData } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.DRIVER,role.eq.driver,role.eq.LOGISTICS,role.eq.logistics');

      if (driverData) {
        const driverMap = {};
        driverData.forEach((d) => {
          driverMap[d.id] = {
            name: d.full_name || d.name || 'Courier Agent',
            phone: d.phone || '+91 98112 04821',
            vehicle: d.vehicle_number || 'Express Cargo Unit',
            photo: d.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`
          };
        });
        setCourierProfiles(driverMap);
      }
    };

    fetchRecipientsAndDrivers();
  }, []);

  const activeNgo = recipients.find((r) => r.id === selectedNgoId) || recipients[0];

  // 2. Filter Pools
  const openDonations = useMemo(() => {
    return donations.filter((d) => {
      const isOpen = d.status === 'Pending Pickup' || d.status === 'Available';
      const matchesSearch = 
        d.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.donor?.toLowerCase().includes(searchTerm.toLowerCase());
      return isOpen && matchesSearch;
    });
  }, [donations, searchTerm]);

  const inboundDonations = useMemo(() => {
    return donations.filter((d) => 
      (d.claimed_by === selectedNgoId || d.claimed_by_id === selectedNgoId) &&
      d.status !== 'Completed'
    );
  }, [donations, selectedNgoId]);

  const completedHistory = useMemo(() => {
    return donations.filter((d) => 
      (d.claimed_by === selectedNgoId || d.claimed_by_id === selectedNgoId) &&
      d.status === 'Completed'
    );
  }, [donations, selectedNgoId]);

  // 3. Claim Allocation Batch & Generate Driver Delivery Vector
  const handleConfirmClaim = async () => {
    if (!claimModalItem || !selectedNgoId) return;

    try {
      setIsClaiming(true);

      const updates = {
        status: 'Claimed - Awaiting Dispatch',
        claimed_by_id: selectedNgoId,
        claimed_at: new Date().toISOString()
      };

      // Update Donation Table
      if (updateDonationStatus) {
        await updateDonationStatus(claimModalItem.id, updates);
      } else {
        const { error } = await supabase
          .from('donations')
          .update(updates)
          .eq('id', claimModalItem.id);
          
        if (error) throw error;
      }

      // Automatically spawn a delivery mission for Fleet couriers
      await supabase.from('delivery_routes').insert([
        {
          title: `${claimModalItem.donor} ➔ ${activeNgo?.name || 'Recipient Hub'}`,
          cargo: `${claimModalItem.quantity} - ${claimModalItem.item}`,
          eta_mins: 25,
          decay_window: `Safe window: ${claimModalItem.expiry}`,
          progress: 10,
          status: 'Awaiting Driver Pickup',
          urgency: claimModalItem.is_urgent ? 'warning' : 'normal'
        }
      ]);

      setClaimModalItem(null);
    } catch (err) {
      alert('Error claiming donation: ' + err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  // 4. Direct Delivery Confirmation from NGO Desk
  const handleDirectConfirmReceipt = async (item) => {
    try {
      const updates = {
        status: 'Completed',
        delivered_at: new Date().toISOString()
      };
      if (updateDonationStatus) {
        await updateDonationStatus(item.id, updates);
      } else {
        const { error } = await supabase.from('donations').update(updates).eq('id', item.id);
        if (error) throw error;
      }
      setConfirmPinModal(null);
    } catch (err) {
      alert('Error confirming receipt: ' + err.message);
    }
  };

  return (
    <div className="ngo-container fade-in">
      {/* Identity Topbar with Operating Center Selector */}
      <div className="ngo-identity-bar">
        <div className="identity-info">
          <div className="ngo-avatar-icon">
            <Building2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="identity-title">{activeNgo?.name || 'NGO Beneficiary Hub'}</h2>
              <span className="badge-verified">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Hub
              </span>
            </div>
            <p className="identity-sub">
              {activeNgo?.address || 'Central Distribution Point'} • Handover Verification PIN: <strong className="pin-highlight">{activeNgo?.pin || '4821'}</strong>
            </p>
          </div>
        </div>

        <div className="ngo-selector-wrap">
          <label>Operating Center:</label>
          <select 
            value={selectedNgoId} 
            onChange={(e) => setSelectedNgoId(e.target.value)}
            className="ngo-select-input"
          >
            {recipients.map((ngo) => (
              <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="ngo-metrics-grid">
        <div className="ngo-stat-card">
          <div>
            <span className="stat-label">Daily Capacity</span>
            <h3 className="stat-number">{activeNgo?.capacity_per_day || 500}</h3>
            <span className="stat-sub positive">Meals / Day Window</span>
          </div>
          <div className="stat-icon green"><Package className="w-5 h-5" /></div>
        </div>

        <div className="ngo-stat-card">
          <div>
            <span className="stat-label">Inbound Shipments</span>
            <h3 className="stat-number">{inboundDonations.length}</h3>
            <span className="stat-sub neutral"><Truck className="w-3.5 h-3.5" /> Active En Route</span>
          </div>
          <div className="stat-icon blue"><Truck className="w-5 h-5" /></div>
        </div>

        <div className="ngo-stat-card">
          <div>
            <span className="stat-label">Open Cargo Available</span>
            <h3 className="stat-number">{openDonations.length}</h3>
            <span className="stat-sub warning"><AlertTriangle className="w-3.5 h-3.5" /> Ready to Claim</span>
          </div>
          <div className="stat-icon amber"><Sparkles className="w-5 h-5" /></div>
        </div>

        <div className="ngo-stat-card">
          <div>
            <span className="stat-label">Total Allocated Lots</span>
            <h3 className="stat-number">{completedHistory.length}</h3>
            <span className="stat-sub positive"><CheckCircle2 className="w-3.5 h-3.5" /> Distributed</span>
          </div>
          <div className="stat-icon purple"><Building2 className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Main 2-Column Workflow Layout */}
      <div className="ngo-layout">
        {/* Left Column: Network Centers Directory */}
        <div className="ngo-main">
          <div className="section-head-row">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="ngo-heading">Verified Recipient Centers</h3>
            </div>
            <span className="count-badge">{recipients.length} Active Nodes</span>
          </div>

          <div className="ngo-list">
            {recipients.map((org) => {
              const isCurrent = org.id === selectedNgoId;
              return (
                <div 
                  key={org.id} 
                  className={`ngo-card ${isCurrent ? 'active-node' : ''}`}
                  onClick={() => setSelectedNgoId(org.id)}
                >
                  <div className="ngo-card-left">
                    <div className="flex items-center gap-2">
                      <h4 className="ngo-title">{org.name}</h4>
                      {isCurrent && <span className="current-pill">Current Terminal</span>}
                    </div>
                    <p className="ngo-meta">
                      Capacity: <strong>{org.capacity_per_day} meals</strong> • Storage: <strong>{org.storage_type}</strong>
                    </p>
                    <p className="ngo-address">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {org.address}
                    </p>
                  </div>
                  <div className="ngo-card-right">
                    <span className="badge-verified">
                      <UserCheck className="w-3.5 h-3.5" /> Ready
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Claim Pool, Inbound Shipments, and Delivered History */}
        <div className="ngo-claim-desk">
          <div className="desk-header">
            <div className="desk-tab-switcher">
              <button 
                className={`desk-tab ${activeTab === 'OPEN_POOL' ? 'active' : ''}`}
                onClick={() => setActiveTab('OPEN_POOL')}
              >
                Open Cargo Pool ({openDonations.length})
              </button>
              <button 
                className={`desk-tab ${activeTab === 'INBOUND' ? 'active' : ''}`}
                onClick={() => setActiveTab('INBOUND')}
              >
                Inbound Deliveries ({inboundDonations.length})
              </button>
              <button 
                className={`desk-tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
                onClick={() => setActiveTab('HISTORY')}
              >
                Completed ({completedHistory.length})
              </button>
            </div>
          </div>

          {/* Tab 1: Open Pool */}
          {activeTab === 'OPEN_POOL' && (
            <div className="tab-pane-content">
              <div className="search-box mb-3">
                <Search className="search-icon w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Filter surplus food lots by item or donor..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="claim-stack">
                {openDonations.length === 0 ? (
                  <div className="empty-claim-state">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <h4>All Surplus Claimed</h4>
                    <p>No unallocated food items available at this moment.</p>
                  </div>
                ) : (
                  openDonations.map((item) => (
                    <div key={item.id} className="claim-item">
                      <div className="claim-info">
                        <div className="claim-tags">
                          <span className={`cat-pill ${item.type?.toLowerCase().replace(/\s+/g, '-')}`}>
                            {item.type || 'Prepared Meals'}
                          </span>
                          {item.is_urgent && (
                            <span className="urgent-pill">
                              <AlertTriangle className="w-3 h-3" /> Urgent Window
                            </span>
                          )}
                        </div>
                        <h4 className="claim-name">{item.item}</h4>
                        <p className="claim-detail">
                          <strong>{item.quantity}</strong> • Donor: {item.donor}
                        </p>
                        <p className="claim-time">
                          <Clock className="w-3.5 h-3.5" /> Window Remaining: {item.expiry}
                        </p>
                        <p className="claim-location">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.location}
                        </p>
                      </div>

                      <button 
                        className="btn-claim"
                        onClick={() => setClaimModalItem(item)}
                      >
                        Claim for Hub
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Inbound Deliveries with Courier Dossier */}
          {activeTab === 'INBOUND' && (
            <div className="tab-pane-content">
              <div className="claim-stack">
                {inboundDonations.length === 0 ? (
                  <div className="empty-claim-state">
                    <Truck className="w-8 h-8 text-slate-400" />
                    <h4>No Shipments Inbound</h4>
                    <p>No deliveries currently in transit to {activeNgo?.name}.</p>
                  </div>
                ) : (
                  inboundDonations.map((item) => {
                    const driverMeta = courierProfiles[item.driver_id || item.assigned_driver_id] || {
                      name: item.driver_name || 'Assigned Courier',
                      phone: item.driver_phone || '+91 98112 04821',
                      vehicle: item.vehicle_number || 'Express Cargo EV',
                      photo: item.driver_photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.driver_name || 'courier'}`
                    };

                    const isAssigned = item.status === 'In Transit' || item.driver_id;

                    return (
                      <div key={item.id} className="inbound-item">
                        <div className="inbound-info flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`status-pill ${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                              {item.status}
                            </span>
                            <span className="claim-time">
                              <Clock className="w-3.5 h-3.5 inline" /> Window: {item.expiry}
                            </span>
                          </div>

                          <h4 className="claim-name">{item.item}</h4>
                          <p className="claim-detail">{item.quantity} from {item.donor}</p>

                          {/* Live Courier Dossier Box */}
                          {isAssigned ? (
                            <div className="courier-dossier-banner mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={driverMeta.photo}
                                  alt={driverMeta.name} 
                                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-sm bg-slate-200"
                                  onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback'; }}
                                />
                                <div>
                                  <h5 className="font-bold text-sm m-0 text-slate-900">{driverMeta.name}</h5>
                                  <p className="text-xs text-slate-500 m-0">Vehicle: <strong>{driverMeta.vehicle}</strong></p>
                                  <p className="text-xs text-slate-500 m-0">Phone: <strong>{driverMeta.phone}</strong></p>
                                </div>
                              </div>

                              {driverMeta.phone && (
                                <a 
                                  href={`tel:${driverMeta.phone}`} 
                                  className="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-md flex items-center gap-1.5 hover:bg-emerald-200 transition-colors no-underline"
                                >
                                  <Phone className="w-3.5 h-3.5" /> Call Courier
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                              <Clock className="w-3.5 h-3.5 inline mr-1" /> Awaiting driver pickup from Open Pool
                            </div>
                          )}
                        </div>

                        <button 
                          className="btn-confirm-receipt self-center"
                          onClick={() => setConfirmPinModal(item)}
                        >
                          <KeyRound className="w-4 h-4" /> Share PIN & Verify
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 3: History */}
          {activeTab === 'HISTORY' && (
            <div className="tab-pane-content">
              <div className="claim-stack">
                {completedHistory.length === 0 ? (
                  <div className="empty-claim-state">
                    <Package className="w-8 h-8 text-slate-400" />
                    <h4>No Distribution History</h4>
                    <p>Completed deliveries will be logged here.</p>
                  </div>
                ) : (
                  completedHistory.map((item) => (
                    <div key={item.id} className="history-item">
                      <div>
                        <span className="status-pill completed">Delivered</span>
                        <h4 className="claim-name mt-1">{item.item}</h4>
                        <p className="claim-detail">{item.quantity} from {item.donor}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">
                          {item.delivered_at ? new Date(item.delivered_at).toLocaleDateString() : 'Received'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. Claim Cargo Modal */}
      {claimModalItem && (
        <div className="modal-overlay">
          <div className="claim-modal animated-scale">
            <h3 className="modal-title">Confirm Allocation Request</h3>
            <p className="modal-desc">
              Allocate <strong>{claimModalItem.item}</strong> ({claimModalItem.quantity}) to <strong>{activeNgo?.name}</strong>?
            </p>
            <div className="modal-detail-box">
              <p><strong>Donor Origin:</strong> {claimModalItem.location}</p>
              <p><strong>Delivery Hub:</strong> {activeNgo?.address}</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setClaimModalItem(null)}
                disabled={isClaiming}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmClaim}
                disabled={isClaiming}
              >
                {isClaiming ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. NGO Verification PIN Handover Modal */}
      {confirmPinModal && (
        <div className="modal-overlay">
          <div className="claim-modal animated-scale">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-emerald-500" />
              <h3 className="modal-title">Handover PIN Verification</h3>
            </div>
            <p className="modal-desc">
              Share this facility verification PIN with the delivery courier to complete delivery of <strong>{confirmPinModal.item}</strong>.
            </p>
            
            <div className="pin-display-box">
              <span className="pin-digits">{activeNgo?.pin || '4821'}</span>
              <p className="pin-note">Courier enters this PIN in their mobile terminal to complete dropoff</p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setConfirmPinModal(null)}
              >
                Close
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleDirectConfirmReceipt(confirmPinModal)}
              >
                <Check className="w-4 h-4" /> Mark Received (Direct)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}