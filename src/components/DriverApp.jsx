import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Navigation, 
  KeyRound, 
  ShieldCheck, 
  AlertTriangle, 
  Volume2, 
  Compass, 
  Mic, 
  Award, 
  TrendingUp, 
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './DriverApp.css';

const PAYOUT_PER_RUN = 150;

export default function DriverApp({ donations = [], updateDonationStatus, driverUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('GPS_NAV'); // 'GPS_NAV' | 'AVAILABLE' | 'HISTORY'
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // OTP Verification Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Current Active Mission (Only for this specific driver)
  const activeMission = useMemo(() => {
    if (!driverUser) return null;
    return donations.find(
      (d) => (d.driver_id === driverUser.id || d.assigned_driver_id === driverUser.id) &&
             d.status === 'In Transit'
    );
  }, [donations, driverUser]);

  // 2. Open Claimable Runs (Unassigned orders ready for pickup)
  const openMissions = useMemo(() => {
    return donations.filter(
      (d) => (d.status === 'Claimed - Awaiting Dispatch' || d.status === 'Pending Pickup') &&
             (!d.driver_id || d.driver_id === '')
    );
  }, [donations]);

  // 3. Completed Delivery History (Only fulfilled by this driver)
  const completedRuns = useMemo(() => {
    if (!driverUser) return [];
    return donations.filter(
      (d) => (d.driver_id === driverUser.id || d.assigned_driver_id === driverUser.id) &&
             d.status === 'Completed'
    );
  }, [donations, driverUser]);

  const totalEarnings = useMemo(() => completedRuns.length * PAYOUT_PER_RUN, [completedRuns]);

  // Accept Open Mission
  const handleAcceptRun = async (donation) => {
    try {
      const updates = {
        status: 'In Transit',
        driver_id: driverUser.id,
        assigned_driver_id: driverUser.id,
        driver_name: driverUser.name
      };

      if (updateDonationStatus) {
        await updateDonationStatus(donation.id, updates);
      } else {
        const { error } = await supabase.from('donations').update(updates).eq('id', donation.id);
        if (error) throw error;
      }
      setActiveTab('GPS_NAV');
    } catch (err) {
      alert('Error accepting delivery: ' + err.message);
    }
  };

  // Verify OTP and Handover
  const handleVerifyOtpAndComplete = async () => {
    if (!activeMission) return;
    setOtpError('');

    // Check OTP against donation record (or fallback demo OTP)
    const validOtp = activeMission.delivery_otp || '4821';

    if (enteredOtp.trim() !== String(validOtp).trim()) {
      setOtpError('Invalid OTP! Please ask the recipient center for their 4-digit code.');
      return;
    }

    try {
      setIsVerifying(true);
      const updates = {
        status: 'Completed',
        delivered_at: new Date().toISOString()
      };

      if (updateDonationStatus) {
        await updateDonationStatus(activeMission.id, updates);
      } else {
        const { error } = await supabase.from('donations').update(updates).eq('id', activeMission.id);
        if (error) throw error;
      }

      setOtpModalOpen(false);
      setEnteredOtp('');
      setActiveTab('HISTORY');
    } catch (err) {
      setOtpError('Error completing delivery: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="driver-app-shell fade-in">
      {/* Driver Header */}
      <header className="driver-header-card">
        <div className="driver-header-meta">
          <div className="driver-avatar-box">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="driver-name-text">{driverUser?.name || 'Courier Agent'}</h2>
              <span className="driver-status-badge">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Courier
              </span>
            </div>
            <p className="driver-sub-text">
              Vehicle: <strong>{driverUser?.vehicle_number || 'Express Cargo'}</strong> • Payout Rate: <strong>₹150/drop</strong>
            </p>
          </div>
        </div>

        {onLogout && (
          <button onClick={onLogout} className="btn-driver-exit" title="Sign Out">
            <LogOut className="w-4 h-4" /> Exit App
          </button>
        )}
      </header>

      {/* Quick Metrics */}
      <div className="driver-kpi-row">
        <div className="driver-kpi-card highlight">
          <div>
            <span className="kpi-tag">My Total Earnings</span>
            <h3 className="kpi-num">₹{totalEarnings.toLocaleString('en-IN')}</h3>
            <span className="kpi-sub positive"><TrendingUp className="w-3 h-3" /> Direct Bank Credit</span>
          </div>
          <div className="kpi-icon-circle green"><DollarSign className="w-6 h-6" /></div>
        </div>

        <div className="driver-kpi-card">
          <div>
            <span className="kpi-tag">Deliveries Completed</span>
            <h3 className="kpi-num">{completedRuns.length} Runs</h3>
            <span className="kpi-sub positive"><CheckCircle2 className="w-3 h-3" /> 100% On-Time</span>
          </div>
          <div className="kpi-icon-circle blue"><Award className="w-6 h-6" /></div>
        </div>

        <div className="driver-kpi-card">
          <div>
            <span className="kpi-tag">Current Mission</span>
            <h3 className="kpi-num">{activeMission ? '1 Active' : 'Standby'}</h3>
            <span className="kpi-sub neutral"><Clock className="w-3 h-3" /> {activeMission ? activeMission.item : 'Waiting for run'}</span>
          </div>
          <div className="kpi-icon-circle amber"><Navigation className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Driver Navigation Tabs */}
      <nav className="driver-nav-tabs">
        <button 
          className={`driver-tab-btn ${activeTab === 'GPS_NAV' ? 'active' : ''}`}
          onClick={() => setActiveTab('GPS_NAV')}
        >
          <Navigation className="w-4 h-4" /> Tactical GPS {activeMission && <span className="tab-live-dot" />}
        </button>
        <button 
          className={`driver-tab-btn ${activeTab === 'AVAILABLE' ? 'active' : ''}`}
          onClick={() => setActiveTab('AVAILABLE')}
        >
          <AlertTriangle className="w-4 h-4" /> Available Orders ({openMissions.length})
        </button>
        <button 
          className={`driver-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          <Clock className="w-4 h-4" /> Completed Runs ({completedRuns.length})
        </button>
      </nav>

      {/* --- TAB 1: GPS TURN-BY-TURN HUD --- */}
      {activeTab === 'GPS_NAV' && (
        <div className="gps-container">
          {activeMission ? (
            <div className="gps-active-board">
              {/* Turn-by-Turn Instruction Banner */}
              <div className="gps-hud-top">
                <div className="turn-compass">
                  <Compass className="w-7 h-7 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="turn-details">
                  <h3>In 400m, Turn Right onto Service Road</h3>
                  <p>En route to: <strong>{activeMission.location}</strong></p>
                </div>
                <button 
                  className={`voice-toggle-btn ${voiceEnabled ? 'active' : ''}`}
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Map Canvas with Route Vectors and Vehicle Marker */}
              <div className="gps-map-viewport">
                <div className="gps-map-grid-bg">
                  <svg className="gps-route-svg" viewBox="0 0 800 500" preserveAspectRatio="none">
                    <path
                      d="M 120 420 L 220 380 L 280 260 L 360 210 L 460 260 L 520 200 L 620 140 L 680 90"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="24"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 120 420 L 220 380 L 280 260 L 360 210 L 460 260 L 520 200 L 620 140 L 680 90"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animated-blue-polyline"
                    />
                  </svg>

                  {/* Destination Pin */}
                  <div className="gps-pin-marker destination-pin" style={{ left: '84%', top: '16%' }}>
                    <div className="pin-head"><div className="pin-dot" /></div>
                    <span className="pin-tag">{activeMission.location}</span>
                  </div>

                  {/* Moving Vehicle */}
                  <div className="gps-car-marker" style={{ left: '26%', top: '48%' }}>
                    <div className="car-graphic">
                      <div className="car-roof"></div>
                    </div>
                  </div>

                  {/* Voice Control FAB */}
                  <button className="gps-voice-fab" onClick={() => alert('Listening for destination update...')}>
                    <Mic className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Bottom Telemetry HUD */}
              <div className="gps-hud-bottom">
                <div className="hud-metric">
                  <span className="hud-lbl">ETA</span>
                  <h4 className="hud-val text-emerald-400">12 <span className="hud-unit">mins</span></h4>
                </div>
                <div className="hud-metric">
                  <span className="hud-lbl">Remaining</span>
                  <h4 className="hud-val">3.6 <span className="hud-unit">km</span></h4>
                </div>
                <div className="hud-metric">
                  <span className="hud-lbl">Decay Buffer</span>
                  <h4 className="hud-val text-amber-400">{activeMission.expiry || 'Safe'}</h4>
                </div>
                
                {/* Trigger OTP Handover Modal */}
                <button 
                  className="btn-complete-handover"
                  onClick={() => { setOtpError(''); setEnteredOtp(''); setOtpModalOpen(true); }}
                >
                  <KeyRound className="w-5 h-5" /> Arrived & Enter OTP (+₹150)
                </button>
              </div>
            </div>
          ) : (
            <div className="gps-empty-box">
              <Navigation className="w-14 h-14 text-emerald-500 animate-bounce" />
              <h3>No Delivery in Transit</h3>
              <p>Select an available food allocation to initiate real-time GPS routing.</p>
              <button className="btn-go-pool" onClick={() => setActiveTab('AVAILABLE')}>
                View Open Orders ({openMissions.length}) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: AVAILABLE ORDERS FOR CLAIM --- */}
      {activeTab === 'AVAILABLE' && (
        <div className="driver-section-card">
          <div className="section-top-row">
            <div>
              <h3>Available Food Rescue Runs</h3>
              <p>Claim allocations to start pickup and earn ₹150 per verified dropoff</p>
            </div>
            <span className="pool-count-badge">{openMissions.length} Available</span>
          </div>

          {openMissions.length === 0 ? (
            <div className="empty-state-wrap">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <h4>All Orders Claimed</h4>
              <p>Stand by for new surplus broadcasts from donors.</p>
            </div>
          ) : (
            <div className="missions-grid">
              {openMissions.map((item) => (
                <div key={item.id} className="mission-card">
                  <div className="mission-top">
                    <span className="payout-pill">₹{PAYOUT_PER_RUN} Payout</span>
                    <span className="expiry-pill"><Clock className="w-3 h-3" /> {item.expiry}</span>
                  </div>
                  <h4 className="mission-title">{item.item}</h4>
                  <p className="mission-quantity">Quantity: <strong>{item.quantity}</strong> ({item.type || 'Prepared Meals'})</p>
                  <div className="mission-loc-box">
                    <p><MapPin className="w-3.5 h-3.5 inline text-slate-400" /> <strong>Pickup:</strong> {item.donor}</p>
                    <p><MapPin className="w-3.5 h-3.5 inline text-emerald-600" /> <strong>Dropoff:</strong> {item.location}</p>
                  </div>
                  <button className="btn-claim-run" onClick={() => handleAcceptRun(item)}>
                    <Navigation className="w-4 h-4" /> Accept Run & Open GPS
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: COMPLETED DELIVERIES & EARNINGS --- */}
      {activeTab === 'HISTORY' && (
        <div className="driver-section-card">
          <div className="section-top-row">
            <div>
              <h3>My Completed Deliveries</h3>
              <p>Verified dropoffs credited to your courier account</p>
            </div>
            <span className="earnings-badge">Total: ₹{totalEarnings}</span>
          </div>

          {completedRuns.length === 0 ? (
            <div className="empty-state-wrap">
              <Clock className="w-10 h-10 text-slate-400" />
              <h4>No Completed Deliveries</h4>
              <p>Deliveries verified with OTP will be logged here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="driver-history-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Cargo Item</th>
                    <th>Quantity</th>
                    <th>Destination</th>
                    <th>Delivered At</th>
                    <th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {completedRuns.map((run) => (
                    <tr key={run.id}>
                      <td><code>#{String(run.id).slice(0, 6)}</code></td>
                      <td className="font-semibold">{run.item}</td>
                      <td><span className="qty-tag">{run.quantity}</span></td>
                      <td><MapPin className="w-3.5 h-3.5 inline text-emerald-500" /> {run.location}</td>
                      <td>{run.delivered_at ? new Date(run.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}</td>
                      <td className="payout-cell">+₹{PAYOUT_PER_RUN}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- OTP VERIFICATION MODAL --- */}
      {otpModalOpen && (
        <div className="modal-overlay">
          <div className="otp-modal-card animated-scale">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-6 h-6 text-emerald-500" />
              <h3 className="modal-title">Recipient OTP Verification</h3>
            </div>
            <p className="modal-sub">
              Ask the receiving center staff for their <strong>4-digit handover PIN</strong> to confirm delivery of <strong>{activeMission?.item}</strong>.
            </p>

            {otpError && <div className="otp-error-pill">{otpError}</div>}

            <div className="otp-input-wrap">
              <input
                type="text"
                maxLength={4}
                placeholder="• • • •"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                className="otp-field"
                autoFocus
              />
            </div>

            <div className="modal-btn-row">
              <button 
                className="btn-modal-cancel" 
                onClick={() => setOtpModalOpen(false)}
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button 
                className="btn-modal-confirm" 
                onClick={handleVerifyOtpAndComplete}
                disabled={isVerifying || enteredOtp.length !== 4}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : 'Verify & Credit ₹150'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}