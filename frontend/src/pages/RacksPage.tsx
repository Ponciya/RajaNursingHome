import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type Rack = {
  id: number;
  code: string;
  name: string;
  location: string | null;
  description: string | null;
  aisle_shelf: string | null;
  room_number: string | null;
  is_active: number;
};

// Auto-capitalize first letter only
function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

export function RacksPage() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [aisleShelf, setAisleShelf] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { loadRacks(); }, [search]);

  async function loadRacks() {
    try {
      const data = await apiRequest<Rack[]>(`/api/racks?search=${search}`);
      setRacks(data);
    } catch (err) { setError("Failed to load racks"); }
  }

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setAisleShelf("");
    setRoomNumber("");
    setLocation("");
    setDescription("");
  }

  function startEdit(r: Rack) {
    setEditingId(r.id);
    setCode(r.code);
    setName(r.name);
    setAisleShelf(r.aisle_shelf || "");
    setRoomNumber(r.room_number || "");
    setLocation(r.location || "");
    setDescription(r.description || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        code,
        name,
        location,
        description,
        aisle_shelf: aisleShelf,
        room_number: roomNumber,
      };
      if (editingId) {
        await apiRequest(`/api/racks/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess("Rack updated successfully!");
      } else {
        await apiRequest("/api/racks", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Rack added successfully!");
      }
      resetForm();
      loadRacks();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save rack");
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/racks/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadRacks();
    } catch (err) { setError("Failed to update status"); }
  }

  async function deleteRack(id: number, rName: string) {
    if (!confirm(`Delete "${rName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/racks/${id}`, { method: "DELETE" });
      loadRacks();
    } catch (err: any) { setError(err.message || "Failed to delete rack"); }
  }

  return (
    <div className="main-content">
      <h2>Rack Master</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Rack" : "Add New Rack"}</h3>
        <form onSubmit={save} className="form-grid">
          <input
            placeholder="Rack Code * (e.g., A-1)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
          <input
            placeholder="Rack Name * (e.g., Rack A-1)"
            value={name}
            onChange={(e) => setName(capitalizeFirst(e.target.value))}
            required
          />
          <input
            placeholder="Aisle / Shelf (e.g., Aisle 1, Shelf A)"
            value={aisleShelf}
            onChange={(e) => setAisleShelf(capitalizeFirst(e.target.value))}
          />
          <input
            placeholder="Room Number (e.g., Room 101, Ground Floor)"
            value={roomNumber}
            onChange={(e) => setRoomNumber(capitalizeFirst(e.target.value))}
          />
          <input
            placeholder="Location (e.g., Pharmacy - Left Side)"
            value={location}
            onChange={(e) => setLocation(capitalizeFirst(e.target.value))}
          />
          <input
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(capitalizeFirst(e.target.value))}
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Update Rack" : "Add Rack"}
            </button>
            {editingId && <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Racks List</h3>
          <input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "300px" }}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Aisle / Shelf</th>
              <th>Room No.</th>
              <th>Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {racks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                  No racks yet. Add your first rack above.
                </td>
              </tr>
            ) : (
              racks.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.code}</strong></td>
                  <td>{r.name}</td>
                  <td>{r.aisle_shelf || "-"}</td>
                  <td>{r.room_number || "-"}</td>
                  <td>{r.location || "-"}</td>
                  <td>
                    <span className={r.is_active ? "badge-active" : "badge-inactive"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn icon-btn-edit" onClick={() => startEdit(r)} title="Edit"><EditIcon /></button>
                      <button
                        className={`icon-btn ${r.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`}
                        onClick={() => toggleStatus(r.id, r.is_active)}
                        title={r.is_active ? "Deactivate" : "Activate"}
                      >
                        <PowerIcon />
                      </button>
                      <button className="icon-btn icon-btn-delete" onClick={() => deleteRack(r.id, r.name)} title="Delete"><DeleteIcon /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}