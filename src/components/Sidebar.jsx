import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  Sparkles,
  ChevronDown,
  PlusCircle,
  History,
  Navigation,
  MapPin,
  CheckSquare,
  Users,
  BarChart3,
  Award,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import './Sidebar.css';

const ROLE_CONFIGS = {
  ADMIN: {
    badge: 'HQ Central',
    badgeColor: 'emerald',
    title: 'OPERATIONS SUITE',
    navItems: [
      { id: 'ADMIN', label: 'Live Dispatch', icon: LayoutDashboard, badge: 'Live', badgeColor: 'emerald' },
      { id: 'LOGISTICS', label: 'Fleet Control', icon: Truck, badge: 'Active', badgeColor: 'amber' },
      { id: 'NGO', label: 'Partner Centers', icon: Building2, badge: null },
      { id: 'DONOR', label: 'Donor Desk', icon: PlusCircle, badge: null }
    ]
  },
  DONOR: {
    badge: 'Donor Node',
    badgeColor: 'blue',
    title: 'DONOR WORKSPACE',
    navItems: [
      { id: 'DONOR', label: 'Report Surplus', icon: PlusCircle, badge: 'Fast', badgeColor: 'emerald' },
      { id: 'ADMIN', label: 'Live Public Feed', icon: LayoutDashboard, badge: null }
    ]
  },
  DRIVER: {
    badge: 'Fleet Courier',
    badgeColor: 'amber',
    title: 'DRIVER TERMINAL',
    navItems: [
      { id: 'LOGISTICS', label: 'Active Missions', icon: Navigation, badge: 'Active', badgeColor: 'amber' },
      { id: 'ADMIN', label: 'Central Stream', icon: LayoutDashboard, badge: null }
    ]
  },
  LOGISTICS: {
    badge: 'Fleet Courier',
    badgeColor: 'amber',
    title: 'DRIVER TERMINAL',
    navItems: [
      { id: 'LOGISTICS', label: 'Active Missions', icon: Navigation, badge: 'Active', badgeColor: 'amber' },
      { id: 'ADMIN', label: 'Central Stream', icon: LayoutDashboard, badge: null }
    ]
  },
  NGO: {
    badge: 'Recipient Hub',
    badgeColor: 'purple',
    title: 'BENEFICIARY DESK',
    navItems: [
      { id: 'NGO', label: 'Claim Cargo Pool', icon: Building2, badge: 'Open', badgeColor: 'emerald' },
      { id: 'LOGISTICS', label: 'Inbound Shipments', icon: Truck, badge: 'Live', badgeColor: 'blue' }
    ]
  }
};

export default function Sidebar({ 
  currentTab, 
  onSelectTab, 
  user = { name: 'Aarav Patel', role: 'ADMIN', organization: 'Central Ops' },
  unreadAlerts = 0,
  theme,
  onToggleTheme,
  onOpenSettings,
  onLogout
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState(true);

  const currentRoleConfig = ROLE_CONFIGS[user?.role?.toUpperCase()] || ROLE_CONFIGS.ADMIN;

  const handleNavClick = (id) => {
    onSelectTab?.(id);
  };

  return (
    <aside className={`bhojan-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-wrap" onClick={() => isCollapsed && setIsCollapsed(false)}>
          <div className={`brand-logo-icon ${currentRoleConfig.badgeColor}`} title={isCollapsed ? 'Click to expand' : undefined}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="brand-meta">
              <h2 className="brand-name">Bhojan<span>Setu</span></h2>
              <span className={`role-pill-badge ${currentRoleConfig.badgeColor}`}>
                {currentRoleConfig.badge}
              </span>
            </div>
          )}
        </div>

        {/* Expand / Collapse Button */}
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Navigation Width"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Body */}
      <div className="sidebar-content">
        <div className="nav-group">
          {!isCollapsed && (
            <div 
              className="section-divider"
              onClick={() => setExpandedSection(!expandedSection)}
            >
              <span>{currentRoleConfig.title}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedSection ? '' : '-rotate-90'}`} />
            </div>
          )}

          {expandedSection && (
            <nav className="nav-list">
              {currentRoleConfig.navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="nav-icon-wrapper">
                      <Icon className="nav-icon w-5 h-5" />
                      {isActive && <div className="active-glow-dot" />}
                    </div>

                    {!isCollapsed && (
                      <div className="nav-text-row">
                        <span className="nav-label">{item.label}</span>
                        {item.badge && (
                          <span className={`nav-badge ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {isCollapsed && (
                      <div className="collapsed-tooltip">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Dynamic Context Widget */}
      {!isCollapsed && (
        <div className="sidebar-status-card">
          <div className="status-card-header">
            <div className="pulse-indicator">
              <span className="pulse-dot" />
              <span className="status-label">Live Gateway</span>
            </div>
            <span className="status-ping">Connected</span>
          </div>
          <div className="status-card-body">
            <Bell className="w-4 h-4 text-slate-400" />
            <span>
              {user.role === 'ADMIN' && `${unreadAlerts} Open Rescues Pending`}
              {user.role === 'DONOR' && `Batch Pickup Window Active`}
              {(user.role === 'DRIVER' || user.role === 'LOGISTICS') && `Vehicle Telemetry Synced`}
              {user.role === 'NGO' && `${unreadAlerts} Lots Open for Claims`}
            </span>
          </div>
        </div>
      )}

      {/* Footer Controls & User Profile */}
      <div className="sidebar-footer">
        <div className="quick-actions-bar">
          <button 
            className="footer-action-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          <button 
            className="footer-action-btn" 
            onClick={onOpenSettings}
            title="System & Profile Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            className="footer-action-btn logout-btn" 
            onClick={onLogout}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
          </button>
        </div>

        <div className="user-profile-wrap">
          <div className="user-avatar" title={isCollapsed ? `${user?.name} (${user?.role})` : undefined}>
            <span>{user?.name?.charAt(0) || 'U'}</span>
            <span className="avatar-online-badge" />
          </div>

          {!isCollapsed && (
            <div className="user-details">
              <div className="user-name-row">
                <h4 className="user-name">{user?.name}</h4>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="user-role">{user?.role} • {user?.organization}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}