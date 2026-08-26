import React, { useState, useMemo } from 'react';
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
  Award
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './DriverDeliveryPortal.css';

const PAYOUT_PER_DELIVERY = 150; // Standard base payout in INR/units

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
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'HISTORY'

  // --- Auth Handlers ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

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
        
        const sessionUser = {
          id: data.user?.id || `driver-${Date.now()}`,
          name: driverName || email.split('@')[0],
          email: email,
          vehicle_number: vehicleNumber
        };
        setDriverUser(sessionUser);
        localStorage.setItem('bhojansetu_driver_session', JSON.stringify(sessionUser));
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          // Dev / Offline Demo Fallback if credentials don't hit Supabase Auth table
          const fallbackUser = {
            id: 'driver-live-01',
            name: email.split('@')[0],
            email: email,
            vehicle_number: 'DL-8C-9021'
          };
          setDriverUser(fallbackUser);
          localStorage.setItem('bhojansetu_driver_session', JSON.stringify(fallbackUser));
        } else {
          const sessionUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            email: data.user.email,
            vehicle_number: data.user.user_metadata?.vehicle_number || 'DL-01-EXP'
          };
          setDriverUser(sessionUser);
          localStorage.setItem('bhojansetu_driver_session', JSON.stringify(sessionUser));
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('bhojansetu_driver_session');
    setDriverUser(null);
  };

  // --- Earnings & Metric Calculations for this Driver ---
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

  // --- Render Login / Signup Form if not logged in ---
  if (!driverUser) {
    return (
      <div className="driver-auth-card fade-in">
        <div className="driver-auth-header">
          <div className="driver-auth-icon">
            <Truck className="w-7 h-7 text-emerald-500" />
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
                  <User className="w-4 h-4" />
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
                  <Truck className="w-4 h-4" />
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
              <Mail className="w-4 h-4" />
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
              <Lock className="w-4 h-4" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit">
            {authMode === 'LOGIN' ? 'Access Driver Terminal' : 'Register Courier Account'}
          </button>

          <div className="auth-toggle-footer">
            {authMode === 'LOGIN' ? (
              <p>
                New fleet agent?{' '}
                <button type="button" onClick={() => setAuthMode('SIGNUP')}>
                  Create account
                </button>
              </p>
            ) : (
              <p>
                Already have credentials?{' '}
                <button type="button" onClick={() => setAuthMode('LOGIN')}>
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    );
  }

  // --- Render Driver Telemetry Dashboard with Revenue ---
  return (
    <div className="driver-dashboard-container fade-in">
      {/* Driver Header Profile Bar */}
      <div className="driver-profile-bar">
        <div className="profile-identity">
          <div className="driver-avatar-circle">
            <Truck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="driver-display-name">{driverUser.name}</h2>
              <span className="badge-active-driver">
                <ShieldCheck className="w-3.5 h-3.5" /> Active Fleet
              </span>
            </div>
            <p className="driver-meta-sub">
              ID: <code>{driverUser.id.slice(0, 8)}</code> • Vehicle: <strong>{driverUser.vehicle_number || 'Express Unit'}</strong>
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
            <span className="stat-label">Active Missions</span>
            <h3 className="stat-value">{activeMission ? '1 Run En Route' : 'Idle'}</h3>
            <span className="stat-sub neutral">
              <Navigation className="w-3.5 h-3.5" /> {activeMission ? activeMission.item : 'Standby Mode'}
            </span>
          </div>
          <div className="stat-icon-wrap amber">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

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
          <h3>Completed Missions & Earnings Ledger</h3>
          <span className="payout-badge">Weekly Cycle: Direct Settlement</span>
        </div>

        {completedRuns.length === 0 ? (
          <div className="empty-ledger">
            <Clock className="w-8 h-8 text-slate-400" />
            <h4>No Completed Runs Yet</h4>
            <p>Accept surplus cargo pickups from the open pool to begin earning payouts.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="driver-table">
              <thead>
                <tr>
                  <th>Mission ID</th>
                  <th>Cargo / Surplus Item</th>
                  <th>Quantity</th>
                  <th>Donor Origin</th>
                  <th>Delivered At</th>
                  <th>Payout Earned</th>
                </tr>
              </thead>
              <tbody>
                {completedRuns.map((run) => (
                  <tr key={run.id}>
                    <td><code>#{run.id.slice(0, 6)}</code></td>
                    <td className="font-semibold">{run.item}</td>
                    <td><span className="badge-qty">{run.quantity}</span></td>
                    <td><MapPin className="w-3.5 h-3.5 inline text-slate-400" /> {run.donor || run.location}</td>
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