import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type Service = { id: number; name: string; unit_price: number; is_active: number; };

// Icons
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

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    try {
      const data = await apiRequest<Service[]>("/api/services");
      setServices(data);
    } catch { setError("Failed to load services"); }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice("");
  }

  function startEdit(s: Service) {
    setEditingId(s.id);
    setName(s.name);
    setPrice(String(s.unit_price));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveService(e: FormEvent) {
    e.preventDefault();
    try {
      const payload = { name, unit_price: Number(price) };

      if (editingId) {
        await apiRequest(`/api/services/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      loadServices();
    } catch (err: any) {
      setError(err.message || "Failed to save service");
    }
  }

  async function toggleStatus(id: number, current: number) {
    await apiRequest(`/api/services/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: current ? 0 : 1 }),
    });
    loadServices();
  }

  async function deleteService(id: number, sName: string) {
    if (!confirm(`Delete "${sName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/services/${id}`, { method: "DELETE" });
      loadServices();
    } catch (err: any) {
      setError(err.message || "Failed to delete service");
    }
  }

  return (
    <div className="main-content">
      <h2>Service Management</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Service" : "Add New Service"}</h3>
        <form onSubmit={saveService} className="form-row">
          <input
            placeholder="Service Name (e.g., Room Rent, Consultation)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price (₹)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            {editingId ? "Update Service" : "Add Service"}
          </button>
          {editingId && (
            <button type="button" className="btn-cancel" onClick={resetForm}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h3>Services List</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price (₹)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.unit_price}</td>
                <td>
                  <span className={s.is_active ? "badge-active" : "badge-inactive"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn icon-btn-edit" onClick={() => startEdit(s)} title="Edit">
                      <EditIcon />
                    </button>
                    <button
                      className={`icon-btn ${s.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`}
                      onClick={() => toggleStatus(s.id, s.is_active)}
                      title={s.is_active ? "Deactivate" : "Activate"}
                    >
                      <PowerIcon />
                    </button>
                    <button className="icon-btn icon-btn-delete" onClick={() => deleteService(s.id, s.name)} title="Delete">
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}