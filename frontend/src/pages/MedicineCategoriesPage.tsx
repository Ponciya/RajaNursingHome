import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type Category = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: number;
};

// Inline Icons
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

export function MedicineCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadCategories();
  }, [search]);

  async function loadCategories() {
    try {
      const data = await apiRequest<Category[]>(`/api/medicine-categories?search=${search}`);
      setCategories(data);
    } catch (err) {
      setError("Failed to load categories");
    }
  }

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setCode(c.code);
    setName(c.name);
    setDescription(c.description || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = { code, name, description };
      if (editingId) {
        await apiRequest(`/api/medicine-categories/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Category updated successfully!");
      } else {
        await apiRequest("/api/medicine-categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Category added successfully!");
      }
      resetForm();
      loadCategories();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save category");
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/medicine-categories/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadCategories();
    } catch (err) {
      setError("Failed to update status");
    }
  }

  async function deleteCategory(id: number, catName: string) {
    if (!confirm(`Delete "${catName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/medicine-categories/${id}`, { method: "DELETE" });
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    }
  }

  return (
    <div className="main-content">
      <h2>Medicine Category Master</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Category" : "Add New Category"}</h3>
        <form onSubmit={saveCategory} className="form-grid">
          <input
            placeholder="Category Code * (e.g., TAB)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
          <input
            placeholder="Category Name * (e.g., Tablet)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Update Category" : "Add Category"}
            </button>
            {editingId && (
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Categories List</h3>
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
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                  No categories yet. Add the first category above.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td>{c.name}</td>
                  <td>{c.description || "-"}</td>
                  <td>
                    <span className={c.is_active ? "badge-active" : "badge-inactive"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn icon-btn-edit" onClick={() => startEdit(c)} title="Edit">
                        <EditIcon />
                      </button>
                      <button
                        className={`icon-btn ${c.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`}
                        onClick={() => toggleStatus(c.id, c.is_active)}
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        <PowerIcon />
                      </button>
                      <button className="icon-btn icon-btn-delete" onClick={() => deleteCategory(c.id, c.name)} title="Delete">
                        <DeleteIcon />
                      </button>
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