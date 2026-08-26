import React from 'react';
import { Truck, Navigation, PhoneCall, BatteryCharging, Thermometer, Clock, RefreshCw, Zap } from 'lucide-react';
import { useLiveLogistics } from '../hooks/useBhojanData';
import './LogisticsDashboard.css';

export default function LogisticsDashboard() {
  const { drivers, routes, loading, refetch } = useLiveLogistics();

  return (
    <div className="logistics-view">
      <div className="logistics-notice">
        <div className="notice-left">
          <Zap className="notice-icon text-amber-500" />
          <p><strong>Smart Dispatch Engine:</strong> Syncing real-time telemetry and delivery vectors from Supabase.</p>
        </div>
        <button className="re-optimize-btn" onClick={refetch}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      <div className="logistics-main-grid">
        {/* Fleet List */}
        <div className="logistics-panel">
          <div className="panel-header-row">
            <h3 className="panel-head-title"><Truck className="truck-icon" /> Live Fleet Status</h3>
            <span className="live-route-count">{drivers.length} Units</span>
          </div>

          <div className="fleet-list">
            {loading ? (
              <p className="text-gray-400 p-4">Fetching drivers...</p>
            ) : (
              drivers.map((d) => (
                <div key={d.id} className="fleet-card">
                  <div className="fleet-header">
                    <div>
                      <p className="fleet-name">{d.name}</p>
                      <p className="fleet-type">{d.vehicle}</p>
                    </div>
                    <span className={`fleet-pill ${d.status.includes('Standby') ? 'standby' : 'active'}`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="fleet-telemetry-row">
                    <span className="telemetry-badge">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" /> {d.battery}
                    </span>
                    {d.temperature !== 'Ambient' && (
                      <span className="telemetry-badge cold">
                        <Thermometer className="w-3.5 h-3.5 text-blue-600" /> {d.temperature}
                      </span>
                    )}
                    <span className="telemetry-badge">Load: {d.capacity}</span>
                  </div>

                  <div className="fleet-footer">
                    <span className="assigned-mission-text">
                      {d.assigned_route || 'Awaiting dispatch'}
                    </span>
                    {d.phone && (
                      <a href={`tel:${d.phone}`} className="call-driver-btn" title="Call Courier">
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Vectors */}
        <div className="logistics-panel">
          <div className="panel-header-row">
            <h3 className="panel-head-title"><Navigation className="nav-icon-blue" /> Active Delivery Vectors</h3>
            <span className="live-route-count">{routes.length} Active</span>
          </div>

          <div className="vector-routes">
            {loading ? (
              <p className="text-gray-400 p-4">Loading active missions...</p>
            ) : routes.length === 0 ? (
              <p className="text-gray-400 p-4">No active delivery routes in transit.</p>
            ) : (
              routes.map((route) => (
                <div key={route.id} className={`vector-node ${route.urgency === 'warning' ? 'warning-border' : ''}`}>
                  <div className="vector-header">
                    <span className={`vector-indicator ${route.urgency === 'warning' ? 'amber' : 'green'}`}></span>
                    <h4 className="vector-title">{route.title}</h4>
                  </div>
                  <div className="vector-meta">
                    <p><strong>Cargo:</strong> {route.cargo}</p>
                    <p><strong>Courier:</strong> {route.driver}</p>
                  </div>
                  <div className="vector-timing-row">
                    <span className="eta-badge"><Clock className="w-3.5 h-3.5" /> ETA: {route.eta_mins} mins</span>
                    <span className={`decay-badge ${route.urgency === 'warning' ? 'urgent' : ''}`}>{route.decay_window}</span>
                  </div>
                  <div className="vector-progress-wrapper">
                    <div className="vector-progress">
                      <div className={`vector-fill ${route.urgency === 'warning' ? 'amber' : 'green'}`} style={{ width: `${route.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}