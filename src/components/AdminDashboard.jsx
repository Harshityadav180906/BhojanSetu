import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  TrendingUp, 
  Truck, 
  Building2, 
  Clock, 
  Search, 
  AlertTriangle, 
  UserCheck, 
  ShieldAlert, 
  ArrowUpRight 
} from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard({ donations = [], loading = false, updateDonationStatus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const matchesSearch = 
        d.donor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = 
        selectedStatus === 'ALL' || d.status?.toUpperCase() === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [donations, searchTerm, selectedStatus]);

  const handleQuickAdvance = async (id, currentStatus) => {
    const nextStatus = 
      currentStatus === 'Pending Pickup' ? 'In Transit' :
      currentStatus === 'In Transit' ? 'Delivered' : 'Completed';
    if (updateDonationStatus) {
      await updateDonationStatus(id, { status: nextStatus });
    }
  };

  const pendingCount = donations.filter(d => d.status === 'Pending Pickup').length;
  const transitCount = donations.filter(d => d.status === 'In Transit').length;
  const completedCount = donations.filter(d => d.status === 'Delivered' || d.status === 'Completed').length;

  return (
    <div className="admin-frame fade-in">
      {/* Top Stats 4-Card Grid */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-label">Total Broadcasts</p>
            <h3 className="stat-number">{donations.length}</h3>
            <span className="stat-sub positive"><ArrowUpRight className="w-3.5 h-3.5" /> Live Feed</span>
          </div>
          <div className="stat-icon green"><Heart className="w-5 h-5" /></div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-label">Pending Rescues</p>
            <h3 className="stat-number">{pendingCount}</h3>
            <span className="stat-sub warning"><AlertTriangle className="w-3.5 h-3.5" /> Needs Pickup</span>
          </div>
          <div className="stat-icon blue"><TrendingUp className="w-5 h-5" /></div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-label">In Transit Fleet</p>
            <h3 className="stat-number">{transitCount}</h3>
            <span className="stat-sub neutral"><Truck className="w-3.5 h-3.5" /> Vectors En Route</span>
          </div>
          <div className="stat-icon amber"><Truck className="w-5 h-5" /></div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-label">Completed Deliveries</p>
            <h3 className="stat-number">{completedCount}</h3>
            <span className="stat-sub positive"><ShieldAlert className="w-3.5 h-3.5" /> Zero Wastage</span>
          </div>
          <div className="stat-icon purple"><Building2 className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="table-wrapper-card">
        <div className="table-topbar">
          <div className="table-heading-group">
            <h3>BhojanSetu Live Dispatch Stream</h3>
            <span className="live-chip">Central Control</span>
          </div>

          <div className="table-actions">
            <div className="search-box">
              <Search className="search-icon w-4 h-4" />
              <input
                type="text"
                placeholder="Filter by donor, food item, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="status-filter">
              {['ALL', 'PENDING PICKUP', 'IN TRANSIT', 'DELIVERED', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  className={`filter-btn ${selectedStatus === st ? 'active' : ''}`}
                  onClick={() => setSelectedStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="table-scroll-container">
          <table className="bhojan-table">
            <thead>
              <tr>
                <th>Source Donor</th>
                <th>Resource Item</th>
                <th>Volume</th>
                <th>Consumption Window</th>
                <th>Pipeline Status</th>
                <th>Assigned Agent</th>
                <th className="text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty-row">
                    Connecting to realtime stream...
                  </td>
                </tr>
              ) : filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-row">
                    No active dispatches found matching your search.
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.id} className="table-hover-row">
                    <td className="font-bold">
                      <div className="donor-cell">
                        <span>{d.donor}</span>
                        {d.is_urgent && (
                          <span className="urgent-badge" title="Urgent Window">
                            <AlertTriangle className="w-3 h-3 text-rose-500" /> Urgent
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{d.item}</td>
                    <td><span className="qty-pill">{d.quantity}</span></td>
                    <td>
                      <span className="clock-align">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {d.expiry}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${d.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <span className="agent-text">
                        {d.assignedDriver || <span className="unassigned">Awaiting Courier</span>}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn-action-icon"
                        title="Advance Pipeline Status"
                        onClick={() => handleQuickAdvance(d.id, d.status)}
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}