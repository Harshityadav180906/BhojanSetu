import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Navigation, 
  PhoneCall, 
  BatteryCharging, 
  Clock, 
  CheckCircle2, 
  Zap, 
  X, 
  User, 
  Mail, 
  MapPin, 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert,
  Hash
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './LogisticsDashboard.css';

export default function LogisticsDashboard({ donations = [] }) {
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Fetch Drivers from profiles & drivers table
  const fetchFleetData = async () => {
    setLoading(true);
    try {
      const [profilesRes, driversRes, routesRes] = await Promise.all([
        supabase.from('profiles').select('*').or('role.eq.DRIVER,role.eq.driver,role.eq.LOGISTICS,role.eq.logistics'),
        supabase.from('drivers').select('*'),
        supabase.from('delivery_routes').select('*, drivers(name)').order('created_at', { ascending: false })
      ]);

      const driverMap = new Map();

      // Merge profiles
      (profilesRes.data || []).forEach((p, idx) => {
        driverMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.name || `Courier #${idx + 1}`,
          email: p.email || 'driver@bhojansetu.org',
          phone: p.phone || '+91 98112 04821',
          address: p.address || 'Sector 14, Fleet Terminal Hub, New Delhi',
          vehicle: p.vehicle_number || 'Express Van - DL 03 AX 1234',
          battery: '92%',
          capacity: '350 kg',
          status: 'Active Duty',
          assigned_route: 'Express Pipeline Node',
          photo_url: p.avatar_url || p.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`,
          security_pin: p.pin || p.delivery_otp || '4821',
          access_key: `BS-FLEET-${String(p.id).slice(0, 5).toUpperCase()}`
        });
      });

      // Merge seed drivers
      (driversRes.data || []).forEach((d) => {
        if (!driverMap.has(d.id)) {
          driverMap.set(d.id, {
            id: d.id,
            name: d.name,
            email: d.email || 'courier@bhojansetu.org',
            phone: d.phone || '+91 98765 11223',
            address: d.address || 'Connaught Place Depo Station 2',
            vehicle: d.vehicle || 'Tata Ace EV',
            battery: d.battery || '88%',
            capacity: d.capacity || '400 kg',
            status: d.status || 'Active Duty',
            assigned_route: d.assigned_route || 'Standby Run',
            photo_url: d.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.name}`,
            security_pin: '7394',
            access_key: `BS-FLEET-${String(d.id).slice(0, 5).toUpperCase()}`
          });
        }
      });

      setDrivers(Array.from(driverMap.values()));

      if (!routesRes.error) {
        setRoutes(
          (routesRes.data || []).map((r) => ({
            ...r,
            driver: r.drivers?.name || 'Unassigned (Open for Claim)'
          }))
        );
      }
    } catch (err) {
      console.error('Error loading logistics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  return (
    <div className="logistics-view">
      {/* Notice Banner */}
      <div className="logistics-notice">
        <div className="notice-left">
          <Zap className="notice-icon text-amber-500" />
          <p>
            <strong>Fleet Command:</strong> Click any courier card to view complete identity credentials, contact info, and route dossiers.
          </p>
        </div>
        <button className="re-optimize-btn" onClick={fetchFleetData}>
          Refresh Fleet
        </button>
      </div>

      <div className="logistics-main-grid">
        {/* Left Column: Fleet Couriers */}
        <div className="logistics-panel">
          <div className="panel-header-row">
            <h3 className="panel-head-title">
              <Truck className="truck-icon text-emerald-500" /> Active Courier Units
            </h3>
            <span className="live-route-count">{drivers.length} Units Online</span>
          </div>

          <div className="fleet-list">
            {drivers.map((d) => (
              <div 
                key={d.id} 
                className="fleet-card"
                onClick={() => setSelectedDriver(d)}
                title="Click to view driver dossier"
              >
                <div className="fleet-header">
                  <div className="fleet-driver-info-group">
                    <img 
                      src={d.photo_url} 
                      alt={d.name} 
                      className="fleet-driver-avatar-thumb"
                      onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=driver'; }}
                    />
                    <div>
                      <p className="fleet-name">{d.name}</p>
                      <p className="fleet-type">{d.vehicle}</p>
                    </div>
                  </div>
                  <span className={`fleet-pill ${d.status.toLowerCase().includes('standby') ? 'standby' : 'active'}`}>
                    {d.status}
                  </span>
                </div>

                <div className="fleet-telemetry-row">
                  <span className="telemetry-badge">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" /> {d.battery}
                  </span>
                  <span className="telemetry-badge">Payload: {d.capacity}</span>
                  <span className="telemetry-badge">ID: {String(d.id).slice(0, 6)}</span>
                </div>

                <div className="fleet-footer">
                  <span className="assigned-mission-text">{d.assigned_route}</span>
                  <a 
                    href={`tel:${d.phone}`} 
                    className="call-driver-btn" 
                    title="Call Courier"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Claimed Delivery Vectors */}
        <div className="logistics-panel">
          <div className="panel-header-row">
            <h3 className="panel-head-title">
              <Navigation className="nav-icon-blue text-blue-500" /> Claimed Delivery Vectors
            </h3>
            <span className="live-route-count">{routes.length} Active</span>
          </div>

          <div className="vector-routes">
            {routes.length === 0 ? (
              <p className="text-slate-400 p-4">No active delivery routes in progress.</p>
            ) : (
              routes.map((route) => (
                <div key={route.id} className={`vector-node ${route.urgency === 'warning' ? 'warning-border' : ''}`}>
                  <div className="vector-header">
                    <span className={`vector-indicator ${route.urgency === 'warning' ? 'amber' : 'green'}`}></span>
                    <h4 className="vector-title">{route.title}</h4>
                  </div>

                  <p className="vector-meta"><strong>Cargo:</strong> {route.cargo}</p>
                  <p className="vector-meta"><strong>Courier:</strong> {route.driver}</p>

                  <div className="vector-timing-row">
                    <span className="eta-badge"><Clock className="w-3.5 h-3.5" /> ETA: {route.eta_mins} mins</span>
                    <span className={`decay-badge ${route.urgency === 'warning' ? 'urgent' : ''}`}>{route.decay_window}</span>
                  </div>

                  <div className="vector-progress-wrapper">
                    <div className="vector-progress">
                      <div className={`vector-fill ${route.urgency === 'warning' ? 'amber' : 'green'}`} style={{ width: `${route.progress || 35}%` }}></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- POPUP MODAL: DETAILED DRIVER PROFILE & DOSSIER --- */}
      {selectedDriver && (
        <div className="driver-modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="driver-dossier-card" onClick={(e) => e.stopPropagation()}>
            {/* Header with Photo & Name */}
            <div className="dossier-header-cover">
              <div className="dossier-photo-wrap">
                <img 
                  src={selectedDriver.photo_url} 
                  alt={selectedDriver.name} 
                  className="dossier-avatar-img"
                  onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback'; }}
                />
                <div className="dossier-title-meta">
                  <h3>{selectedDriver.name}</h3>
                  <p>{selectedDriver.vehicle}</p>
                  <span className="dossier-verified-badge">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Courier Node
                  </span>
                </div>
              </div>
              <button 
                className="dossier-close-btn"
                onClick={() => setSelectedDriver(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Body with Complete Details */}
            <div className="dossier-body">
              <div className="dossier-info-grid">
                {/* Driver ID */}
                <div className="dossier-field-box">
                  <span className="dossier-field-label"><Hash className="w-3 h-3" /> System UUID</span>
                  <span className="dossier-field-val"><code>{selectedDriver.id}</code></span>
                </div>

                {/* Tactical Access Key */}
                <div className="dossier-field-box">
                  <span className="dossier-field-label"><ShieldAlert className="w-3 h-3" /> Terminal Key</span>
                  <span className="dossier-field-val">{selectedDriver.access_key}</span>
                </div>

                {/* Phone Number */}
                <div className="dossier-field-box">
                  <span className="dossier-field-label"><PhoneCall className="w-3 h-3" /> Contact Phone</span>
                  <span className="dossier-field-val">{selectedDriver.phone}</span>
                </div>

                {/* Email Address */}
                <div className="dossier-field-box">
                  <span className="dossier-field-label"><Mail className="w-3 h-3" /> Dispatch Email</span>
                  <span className="dossier-field-val">{selectedDriver.email}</span>
                </div>

                {/* Handover PIN / OTP */}
                <div className="dossier-field-box">
                  <span className="dossier-field-label"><KeyRound className="w-3 h-3" /> Passcode / PIN</span>
                  <span className="dossier-field-val sec-pin">{selectedDriver.security_pin}</span>
                </div>

                {/* Vehicle Battery & Load */}
                <div className="dossier-field-box">
                  <span className="dossier-field-label"><BatteryCharging className="w-3 h-3" /> Vehicle Telemetry</span>
                  <span className="dossier-field-val">{selectedDriver.battery} • {selectedDriver.capacity}</span>
                </div>

                {/* Registered Base Address */}
                <div className="dossier-field-box full-span">
                  <span className="dossier-field-label"><MapPin className="w-3 h-3" /> Depot / Station Address</span>
                  <span className="dossier-field-val">{selectedDriver.address}</span>
                </div>

                {/* Current Mission Assignment */}
                <div className="dossier-field-box full-span">
                  <span className="dossier-field-label"><Navigation className="w-3 h-3" /> Current Assignment</span>
                  <span className="dossier-field-val text-emerald-600 font-bold">{selectedDriver.assigned_route}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="dossier-actions-row">
              <a href={`tel:${selectedDriver.phone}`} className="btn-dossier-call">
                <PhoneCall className="w-4 h-4" /> Dial Courier Direct
              </a>
              <button className="btn-dossier-close" onClick={() => setSelectedDriver(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}