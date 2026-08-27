import React, { useState, useEffect } from "react";
import { Sliders, X, Check, User, Sun, Moon } from "lucide-react";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";
import DonorPortal from "./components/DonorPortal";
import LogisticsDashboard from "./components/LogisticsDashboard";
import NgoDashboard from "./components/NgoDashboard";
import DriverDeliveryPortal from "./components/DriverDeliveryPortal";
import { useLiveDonations } from "./hooks/useBhojanData";
import { supabase } from "./supabaseClient";
import "./App.css";

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bhojan_theme") || "light"
  );
  const [currentTab, setCurrentTab] = useState("ADMIN");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState(null);

  const { donations, loading, updateDonationStatus } = useLiveDonations();

  // Helper to determine initial landing tab based on user role
  const getDefaultTabForRole = (role) => {
    switch (role?.toUpperCase()) {
      case "DONOR":
        return "DONOR";
      case "NGO":
        return "NGO";
      case "DRIVER":
        return "DRIVER";
      case "LOGISTICS":
        return "LOGISTICS";
      default:
        return "ADMIN";
    }
  };

  // Listen to Supabase session state on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userRole = (
          session.user.user_metadata?.role || "admin"
        ).toUpperCase();

        const activeUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "BhojanSetu Member",
          role: userRole,
          organization:
            session.user.user_metadata?.organization || "Central Ops",
          vehicle_number: session.user.user_metadata?.vehicle_number || "Express Unit",
        };

        setUser(activeUser);
        setCurrentTab(getDefaultTabForRole(userRole));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bhojan_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("sb-token");
    localStorage.removeItem("bhojansetu_driver_session");
    sessionStorage.clear();
  };

  const handleLoginSuccess = (userData) => {
    const normalizedRole = (userData.role || "admin").toUpperCase();
    const activeUser = {
      ...userData,
      role: normalizedRole,
    };
    setUser(activeUser);
    setCurrentTab(getDefaultTabForRole(normalizedRole));
  };

  // Render Login view when logged out
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Count unallocated surplus items for badge
  const pendingRescuesCount = donations.filter(
    (d) => d.status === "Pending Pickup"
  ).length;

  const isDriverRole = user.role === "DRIVER";

  return (
    <div className="app-layout">
      {/* Interactive Role-Adaptive Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        unreadAlerts={pendingRescuesCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Dynamic Viewport */}
      <main className="app-main-content">
        {/* Admin Dashboard */}
        {currentTab === "ADMIN" && (
          <AdminDashboard
            donations={donations}
            loading={loading}
            updateDonationStatus={updateDonationStatus}
          />
        )}

        {/* Driver Portal (Isolated GPS & Deliveries) */}
        {(currentTab === "DRIVER" || (isDriverRole && currentTab === "LOGISTICS")) && (
          <DriverDeliveryPortal
            driverUser={user}
            donations={donations}
            updateDonationStatus={updateDonationStatus}
            onLogout={handleLogout}
          />
        )}

        {/* Global Logistics Fleet Engine (Admin/Manager view) */}
        {currentTab === "LOGISTICS" && !isDriverRole && (
          <LogisticsDashboard donations={donations} />
        )}

        {/* Donor Surplus Report & History */}
        {currentTab === "DONOR" && (
          <DonorPortal 
            user={user} 
            donations={donations}
          />
        )}

        {/* NGO Beneficiary Hub */}
        {currentTab === "NGO" && (
          <NgoDashboard 
            donations={donations} 
            updateDonationStatus={updateDonationStatus}
          />
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(updated) => {
            setUser(updated);
            setIsSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SettingsModal({ user, theme, onToggleTheme, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...user });
  const [activeTab, setActiveTab] = useState("profile");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="settings-modal animated-scale">
        <div className="modal-topbar">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-500" />
            <h3>Control Center & Settings</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-tabs">
            <button
              className={`set-tab ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <User className="w-4 h-4" /> Profile Details
            </button>
            <button
              className={`set-tab ${activeTab === "preferences" ? "active" : ""}`}
              onClick={() => setActiveTab("preferences")}
            >
              <Sliders className="w-4 h-4" /> System & Theme
            </button>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            {activeTab === "profile" ? (
              <div className="form-pane">
                <div className="form-input-block">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-input-block">
                  <label>Organization / Center</label>
                  <input
                    type="text"
                    value={formData.organization || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, organization: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-input-block">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-input-block">
                  <label>Workspace Role</label>
                  <select
                    value={formData.role || "ADMIN"}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <option value="ADMIN">ADMIN (Central Operations)</option>
                    <option value="DONOR">DONOR (Resource Provider)</option>
                    <option value="DRIVER">DRIVER (Fleet Courier)</option>
                    <option value="LOGISTICS">LOGISTICS (Fleet Manager)</option>
                    <option value="NGO">NGO (Beneficiary Hub)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-pane">
                <div className="setting-toggle-row">
                  <div>
                    <h4>Theme Mode</h4>
                    <p>Select light or dark interface styling.</p>
                  </div>
                  <button
                    type="button"
                    className="theme-switcher-btn"
                    onClick={onToggleTheme}
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                    <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                  </button>
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <h4>Real-time Telemetry Push</h4>
                    <p>Receive sound and visual alerts for high-priority drops.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={formData.notifications || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notifications: e.target.checked,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="settings-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}