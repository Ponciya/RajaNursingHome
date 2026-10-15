import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type AgeCategory = {
  id: number;
  name: string;
  min_age: number;
  max_age: number | null;
  description: string | null;
  is_active: number;
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

export function AgeCategoriesPage() {
  const [items, setItems] = useState<AgeCategory[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { loadItems(); }, [search]);

  async function loadItems() {
    try {
      const data = await apiRequest<AgeCategory[]>(`/api/age-categories?search=${search}`);
      setItems(data);
    } catch (err) {
      setError("Failed to load age categories");
    }
  }

  function resetForm() {
    setEditingId(null);
    setName(""); setMinAge(""); setMaxAge(""); setDescription("");
  }

  function startEdit(a: AgeCategory) {
    setEditingId(a.id);
    setName(a.name);
    setMinAge(String(a.min_age));
    setMaxAge(a.max_age != null ? String(a.max_age) : "");
    setDescription(a.description || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (maxAge && Number(maxAge) < Number(minAge)) {
      setError("Max age cannot be less than min age");
      return;
    }

    try {
      const payload = {
        name,
        min_age: Number(minAge),
        max_age: maxAge ? Number(maxAge) : null,
        description,
      };
      if (editingId) {
        await apiRequest(`/api/age-categories/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess("Age category updated successfully!");
      } else {
        await apiRequest("/api/age-categories", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Age category added successfully!");
      }
      resetForm();
      loadItems();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save age category");
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/age-categories/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadItems();
    } catch (err) { setError("Failed to update status"); }
  }

  async function deleteItem(id: number, aName: string) {
    if (!confirm(`Delete "${aName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/age-categories/${id}`, { method: "DELETE" });
      loadItems();
    } catch (err: any) { setError(err.message || "Failed to delete age category"); }
  }

  return (
    <div className="main-content">
      <h2>Age Category Master</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Age Category" : "Add New Age Category"}</h3>
        <form onSubmit={saveItem} className="form-grid">
          <input placeholder="Category Name * (e.g., Child)" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Min Age * (e.g., 2)" type="number" min="0" value={minAge} onChange={(e) => setMinAge(e.target.value)} required />
          <input placeholder="Max Age (leave blank for no limit)" type="number" min="0" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
          <input placeholder="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Update Category" : "Add Category"}
            </button>
            {editingId && <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Age Categories List</h3>
          <input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "300px" }} />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Age Range</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>No age categories yet. Add the first one above.</td></tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.name}</strong></td>
                  <td>{a.max_age != null ? `${a.min_age} - ${a.max_age} years` : `${a.min_age}+ years`}</td>
                  <td>{a.description || "-"}</td>
                  <td><span className={a.is_active ? "badge-active" : "badge-inactive"}>{a.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn icon-btn-edit" onClick={() => startEdit(a)} title="Edit"><EditIcon /></button>
                      <button className={`icon-btn ${a.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`} onClick={() => toggleStatus(a.id, a.is_active)} title={a.is_active ? "Deactivate" : "Activate"}><PowerIcon /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => deleteItem(a.id, a.name)} title="Delete"><DeleteIcon /></button>
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