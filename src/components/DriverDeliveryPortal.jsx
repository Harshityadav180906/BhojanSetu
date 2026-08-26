import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Lock, 
  Mail, 
  User, 
  LogOut, 
  TrendingUp, 
  Navigation, 
  ShieldCheck,
  Award,
  Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './DriverDeliveryPortal.css';

const PAYOUT_PER_DELIVERY = 150;

export default function DriverDeliveryPortal({ donations = [], updateDonationStatus }) {
  const [driverUser, setDriverUser] = useState(() => {
    const saved = localStorage.getItem('bhojansetu_driver_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState('LOGIN'); // 'LOGIN' | 'SIGNUP'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Load active session from Supabase on mount
  useEffect(() => {
    const checkDriverSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch fresh metadata from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const freshData = {
          id: session.user.id,
          name: profile?.name || session.user.user_metadata?.name || session.user.email.split('@')[0],
          email: session.user.email,
          vehicle_number: profile?.vehicle_number || session.user.user_metadata?.vehicle_number || 'Express Unit'
        };

        setDriverUser(freshData);
        localStorage.setItem('bhojansetu_driver_session', JSON.stringify(freshData));
      }
    };
    checkDriverSession();
  }, []);

  // --- Auth Handlers ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (authMode === 'SIGNUP') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: driverName,
              vehicle_number: vehicleNumber,
              role: 'driver'
            }
          }
        });
        if (error) throw error;

        if (data.user) {
          // Backup insert directly to profiles table
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            name: driverName,
            vehicle_number: vehicleNumber,
            role: 'driver'
          });

          const sessionUser = {
            id: data.user.id,
            name: driverName || email.split('@')[0],
            email: data.user.email,
            vehicle_number: vehicleNumber
          };
          setDriverUser(sessionUser);
          localStorage.setItem('bhojansetu_driver_session', JSON.stringify(sessionUser));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const sessionUser = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || data.user.email.split('@')[0],
            email: data.user.email,
            vehicle_number: profile?.vehicle_number || data.user.user_metadata?.vehicle_number || 'Express Unit'
          };
          setDriverUser(sessionUser);
          localStorage.setItem('bhojansetu_driver_session', JSON.stringify(sessionUser));
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('bhojansetu_driver_session');
    setDriverUser(null);
  };

  // --- Strict Driver-Specific Filtering ---
  const driverDeliveries = useMemo(() => {
    if (!driverUser) return [];
    return donations.filter(
      (d) => (d.driver_id === driverUser.id || d.driver_name === driverUser.name)
    );
  }, [donations, driverUser]);

  const completedRuns = useMemo(() => {
    return driverDeliveries.filter((d) => d.status === 'Completed');
  }, [driverDeliveries]);

  const totalEarnings = useMemo(() => {
    return completedRuns.length * PAYOUT_PER_DELIVERY;
  }, [completedRuns]);

  const activeMission = useMemo(() => {
    return donations.find(
      (d) => (d.driver_id === driverUser?.id || d.driver_name === driverUser?.name) && d.status === 'In Transit'
    );
  }, [donations, driverUser]);

  // Mark an active delivery as completed
  const handleCompleteMission = async (missionId) => {
    if (!updateDonationStatus) return;
    await updateDonationStatus(missionId, 'Completed');
  };

  // --- Login / Signup Form ---
  if (!driverUser) {
    return (
      <div className="driver-auth-card fade-in">
        <div className="driver-auth-header">
          <div className="driver-auth-icon">
            <Truck className="w-8 h-8 text-emerald-500" />
          </div>
          <h2>BhojanSetu Courier Terminal</h2>
          <p>Login to access tactical routes, claim rescue runs, and track payouts</p>
        </div>

        <form onSubmit={handleAuthSubmit} className="driver-auth-form">
          {errorMsg && <div className="auth-error-pill">{errorMsg}</div>}

          {authMode === 'SIGNUP' && (
            <>
              <div className="input-group">
                <label>Full Name</label>
                <div className="input-wrap">
                  <User className="input-icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh Kumar" 
                    value={driverName} 
                    onChange={(e) => setDriverName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Vehicle Plate No.</label>
                <div className="input-wrap">
                  <Truck className="input-icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. DL 03 AX 1234" 
                    value={vehicleNumber} 
                    onChange={(e) => setVehicleNumber(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Courier Email</label>
            <div className="input-wrap">
              <Mail className="input-icon" />
              <input 
                type="email" 
                placeholder="driver@bhojansetu.org" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrap">
              <Lock className="input-icon" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Syncing Terminal...
              </>
            ) : authMode === 'LOGIN' ? (
              'Access Driver Terminal'
            ) : (
              'Register Courier Account'
            )}
          </button>

          <div className="auth-toggle-footer">
            {authMode === 'LOGIN' ? (
              <p>
                New fleet agent?{' '}
                <button type="button" onClick={() => { setErrorMsg(null); setAuthMode('SIGNUP'); }}>
                  Create account
                </button>
              </p>
            ) : (
              <p>
                Already have credentials?{' '}
                <button type="button" onClick={() => { setErrorMsg(null); setAuthMode('LOGIN'); }}>
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    );
  }

  // --- Driver Dashboard ---
  return (
    <div className="driver-dashboard-container fade-in">
      {/* Driver Header Profile Bar */}
      <div className="driver-profile-bar">
        <div className="profile-identity">
          <div className="driver-avatar-circle">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="profile-name-row">
              <h2 className="driver-display-name">{driverUser.name}</h2>
              <span className="badge-active-driver">
                <ShieldCheck className="w-3.5 h-3.5" /> Active Fleet
              </span>
            </div>
            <p className="driver-meta-sub">
              ID: <code>{String(driverUser.id).slice(0, 8)}</code> • Vehicle: <strong>{driverUser.vehicle_number || 'Express Unit'}</strong>
            </p>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-driver-logout">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Revenue & Operations Summary Metrics */}
      <div className="driver-stats-grid">
        <div className="driver-stat-card highlight-earnings">
          <div className="stat-content">
            <span className="stat-label">Total Earnings</span>
            <h3 className="stat-value">₹{totalEarnings.toLocaleString('en-IN')}</h3>
            <span className="stat-sub positive">
              <TrendingUp className="w-3.5 h-3.5" /> ₹{PAYOUT_PER_DELIVERY} / Completed Run
            </span>
          </div>
          <div className="stat-icon-wrap emerald">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="driver-stat-card">
          <div className="stat-content">
            <span className="stat-label">Completed Deliveries</span>
            <h3 className="stat-value">{completedRuns.length}</h3>
            <span className="stat-sub positive">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Success Rate
            </span>
          </div>
          <div className="stat-icon-wrap blue">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="driver-stat-card">
          <div className="stat-content">
            <span className="stat-label">Active Order</span>
            <h3 className="stat-value">{activeMission ? '1 En Route' : 'Idle'}</h3>
            <span className="stat-sub neutral">
              <Navigation className="w-3.5 h-3.5" /> {activeMission ? activeMission.item : 'Standby Mode'}
            </span>
          </div>
          <div className="stat-icon-wrap amber">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active In-Transit Mission Banner (if assigned) */}
      {activeMission && (
        <div className="active-mission-banner">
          <div className="mission-info">
            <span className="active-pulse-badge">Live Cargo En Route</span>
            <h4>{activeMission.item} ({activeMission.quantity})</h4>
            <p><MapPin className="w-4 h-4 inline text-emerald-500" /> Destination: {activeMission.location}</p>
          </div>
          <button 
            className="btn-complete-run"
            onClick={() => handleCompleteMission(activeMission.id)}
          >
            <CheckCircle2 className="w-4 h-4" /> Confirm Delivered (+₹{PAYOUT_PER_DELIVERY})
          </button>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="driver-tabs">
        <button 
          className={`tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          Delivery Ledger ({completedRuns.length})
        </button>
      </div>

      {/* Completed Orders & Payout Ledger Table */}
      <div className="ledger-card">
        <div className="ledger-header">
          <div>
            <h3>Completed Missions & Earnings Ledger</h3>
            <p className="ledger-subtitle">Showing verified deliveries fulfilled by {driverUser.name}</p>
          </div>
          <span className="payout-badge">Weekly Cycle: Direct Settlement</span>
        </div>

        {completedRuns.length === 0 ? (
          <div className="empty-ledger">
            <Clock className="w-10 h-10 empty-icon" />
            <h4>No Completed Runs Recorded</h4>
            <p>Once you accept cargo assignments and mark them delivered, your payout log will appear here.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="driver-table">
              <thead>
                <tr>
                  <th>Mission ID</th>
                  <th>Cargo / Surplus Item</th>
                  <th>Quantity</th>
                  <th>Donor Origin / Drop</th>
                  <th>Delivered At</th>
                  <th>Payout Earned</th>
                </tr>
              </thead>
              <tbody>
                {completedRuns.map((run) => (
                  <tr key={run.id}>
                    <td><code>#{String(run.id).slice(0, 6)}</code></td>
                    <td className="font-semibold">{run.item}</td>
                    <td><span className="badge-qty">{run.quantity}</span></td>
                    <td><MapPin className="w-3.5 h-3.5 inline location-icon" /> {run.donor || run.location}</td>
                    <td>{run.delivered_at ? new Date(run.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}</td>
                    <td className="earning-cell">+₹{PAYOUT_PER_DELIVERY}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}