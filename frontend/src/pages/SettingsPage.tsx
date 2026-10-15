import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";

type HospitalSettings = {
  hospital_name: string;
  address_line1: string;
  address_line2: string;
  landline: string;
  phone: string;
  gstin: string | null;
  drug_licence_no: string | null;
};

// Eye icons (inline)
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Login credentials states
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);

  // Show/hide password states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await apiRequest<HospitalSettings>("/api/settings/hospital");
      setSettings(data);
    } catch (err) {
      setError("Failed to load settings");
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest("/api/settings/hospital", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setLoginError("New passwords do not match");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setLoginError("Password must be at least 6 characters");
      return;
    }

    setSavingLogin(true);
    try {
      await apiRequest("/api/auth/change-credentials", {
        method: "PUT",
        body: JSON.stringify({
          username,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });
      setLoginSuccess("Login updated! Use new credentials next time you sign in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setLoginSuccess(""), 5000);
    } catch (err: any) {
      setLoginError(err.message || "Failed to update login");
    } finally {
      setSavingLogin(false);
    }
  }

  if (!settings) return <div className="main-content">Loading...</div>;

  return (
    <div className="main-content">
      <h2>Admin Settings</h2>

      {/* HOSPITAL INFORMATION */}
      <form onSubmit={saveSettings}>
        <div className="card">
          <h3>Hospital Information</h3>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">✅ {success}</div>}

          <div className="form-grid">
            <label>Hospital Name
              <input value={settings.hospital_name} onChange={(e) => setSettings({ ...settings, hospital_name: e.target.value })} required />
            </label>
            <label>Landline
              <input value={settings.landline || ""} onChange={(e) => setSettings({ ...settings, landline: e.target.value })} />
            </label>
            <label>Address Line 1
              <input value={settings.address_line1 || ""} onChange={(e) => setSettings({ ...settings, address_line1: e.target.value })} />
            </label>
            <label>Address Line 2
              <input value={settings.address_line2 || ""} onChange={(e) => setSettings({ ...settings, address_line2: e.target.value })} />
            </label>
            <label>Phone
              <input value={settings.phone || ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
            </label>
            <label>GSTIN (Optional)
              <input value={settings.gstin || ""} placeholder="Leave blank if not applicable" onChange={(e) => setSettings({ ...settings, gstin: e.target.value || null })} />
            </label>
            <label>Drug Licence No. (Optional)
              <input value={settings.drug_licence_no || ""} placeholder="Leave blank if not applicable" onChange={(e) => setSettings({ ...settings, drug_licence_no: e.target.value || null })} />
            </label>
          </div>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>

      {/* LOGIN CREDENTIALS */}
      <form onSubmit={saveLogin}>
        <div className="card">
          <h3>Login Credentials</h3>
          <p className="muted" style={{ marginBottom: "16px" }}>
            Change your username and password. Use these next time you sign in.
          </p>

          {loginError && <div className="alert alert-error">{loginError}</div>}
          {loginSuccess && <div className="alert alert-success">✅ {loginSuccess}</div>}

          <div className="form-grid">
            <label>Username / Email
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin@rajanursinghome.com"
                required
              />
            </label>

            <label>Current Password *
              <div className="password-wrapper">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  className="password-eye"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </label>

            <label>New Password (leave blank to keep current)
              <div className="password-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="password-eye"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </label>

            <label>Confirm New Password
              <div className="password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  className="password-eye"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </label>
          </div>

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn-primary" disabled={savingLogin}>
              {savingLogin ? "Saving..." : "Update Login"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}