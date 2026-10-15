import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type User = {
  id: number;
  username: string;
  full_name: string;
  role: "ADMIN" | "BILLING_STAFF";
  is_active: number;
  created_at: string;
};

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const PowerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "BILLING_STAFF">("BILLING_STAFF");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await apiRequest<User[]>("/api/users");
      setUsers(data);
    } catch (err) { setError("Failed to load users"); }
  }

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setFullName("");
    setPassword("");
    setRole("BILLING_STAFF");
  }

  function openAdd() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setUsername(u.username);
    setFullName(u.full_name);
    setPassword("");
    setRole(u.role);
    setShowModal(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = { username, full_name: fullName, password, role };
      if (editingId) {
        await apiRequest(`/api/users/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("User updated successfully!");
      } else {
        await apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("User added successfully!");
      }
      setShowModal(false);
      resetForm();
      loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadUsers();
    } catch (err: any) { setError(err.message || "Failed to update status"); }
  }

  async function deleteUser(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/users/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (err: any) { setError(err.message || "Failed to delete user"); }
  }

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>User Management</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add User</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <h3>Users List</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>No users yet.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.full_name}</td>
                  <td>
                    <span className={u.role === "ADMIN" ? "badge-active" : "badge-inactive"}>
                      {u.role === "ADMIN" ? "Admin" : "Billing Staff"}
                    </span>
                  </td>
                  <td><span className={u.is_active ? "badge-active" : "badge-inactive"}>{u.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn icon-btn-edit" onClick={() => openEdit(u)} title="Edit"><EditIcon /></button>
                      <button
                        className={`icon-btn ${u.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`}
                        onClick={() => toggleStatus(u.id, u.is_active)}
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        <PowerIcon />
                      </button>
                      <button className="icon-btn icon-btn-delete" onClick={() => deleteUser(u.id, u.full_name)} title="Delete"><DeleteIcon /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit User" : "Add New User"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save} className="modal-body">
              <label className="form-label-full">
                <span className="form-label-text">Full Name *</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </label>
              <label className="form-label-full">
                <span className="form-label-text">Username *</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label className="form-label-full">
  <span className="form-label-text">
    Password {editingId ? "(leave blank to keep current)" : "*"}
  </span>
  <div className="password-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required={!editingId}
      placeholder={editingId ? "Leave blank to keep current" : "Min 6 characters"}
    />
    <button
      type="button"
      className="password-eye"
      onClick={() => setShowPassword(!showPassword)}
      tabIndex={-1}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        // Eye Icon (password theriyum)
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      ) : (
        // Eye-Off Icon (password maraiyum)
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      )}
    </button>
  </div>
</label>
              <label className="form-label-full">
                <span className="form-label-text">Role *</span>
                <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="BILLING_STAFF">Billing Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update User" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}