import React, { useState, useEffect } from "react";
import { Sliders, X, Check, User, Sun, Moon } from "lucide-react";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";
import DonorPortal from "./components/DonorPortal";
import LogisticsDashboard from "./components/LogisticsDashboard";
import NgoDashboard from "./components/NgoDashboard";
import { useLiveDonations } from "./hooks/useBhojanData";
import { supabase } from "./supabaseClient";
import "./App.css";
import DriverDeliveryPortal from "./components/DriverDeliveryPortal";

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bhojan_theme") || "light",
  );
  const [currentTab, setCurrentTab] = useState("ADMIN");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState(null);

  const { donations, loading, updateDonationStatus } = useLiveDonations();

  // Listen to Supabase session state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userRole = (
          session.user.user_metadata?.role || "admin"
        ).toUpperCase();
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || "BhojanSetu Member",
          role: userRole,
          organization:
            session.user.user_metadata?.organization || "Central Ops",
        });
        setCurrentTab(
          userRole === "DONOR"
            ? "DONOR"
            : userRole === "NGO"
              ? "NGO"
              : userRole === "DRIVER" || userRole === "LOGISTICS"
                ? "LOGISTICS"
                : "ADMIN",
        );
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    sessionStorage.clear();
  };

  const handleLoginSuccess = (userData) => {
    const normalizedRole = (userData.role || "admin").toUpperCase();
    setUser({
      ...userData,
      role: normalizedRole,
    });
    setCurrentTab(
      normalizedRole === "DONOR"
        ? "DONOR"
        : normalizedRole === "NGO"
          ? "NGO"
          : normalizedRole === "LOGISTICS" || normalizedRole === "DRIVER"
            ? "LOGISTICS"
            : "ADMIN",
    );
  };

  // Render Login view when logged out
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingRescuesCount = donations.filter(
    (d) => d.status === "Pending Pickup",
  ).length;

  return (
    <div className="app-layout">
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

      <main className="app-main-content">
        {currentTab === "ADMIN" && (
          <AdminDashboard
            donations={donations}
            loading={loading}
            updateDonationStatus={updateDonationStatus}
          />
        )}
        {currentTab === "LOGISTICS" && (
          <DriverDeliveryPortal
            user={user}
            donations={donations}
            updateDonationStatus={updateDonationStatus}
          />
        )}
        {currentTab === "DONOR" && <DonorPortal user={user} />}
        {currentTab === "LOGISTICS" && <LogisticsDashboard />}
        {currentTab === "NGO" && <NgoDashboard donations={donations} />}
      </main>

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
                    <option value="DRIVER">
                      DRIVER / LOGISTICS (Fleet Courier)
                    </option>
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
                    <p>
                      Receive sound and visual alerts for high-priority drops.
                    </p>
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
