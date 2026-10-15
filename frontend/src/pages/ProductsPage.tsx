import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { SearchableSelect } from "../components/SearchableSelect";

type Product = {
  id: number;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  unit: string | null;
  pack_size: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit_price: number;
  gst_rate: number;
  reorder_level: number | null;
  category_id: number | null;
  category_name: string | null;
  is_active: number;
};

type Category = { id: number; name: string; code: string };

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

const UNITS = ["Tablet", "Capsule", "Strip", "Bottle", "Tube", "Sachet", "Piece", "ml", "mg", "g"];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [unit, setUnit] = useState("");
  const [packSize, setPackSize] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [price, setPrice] = useState("");
  const [gst, setGst] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search]);

  async function loadCategories() {
    try {
      const data = await apiRequest<Category[]>("/api/medicine-categories?active=true");
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories");
    }
  }

  async function loadProducts() {
    try {
      const data = await apiRequest<Product[]>(`/api/products?search=${search}`);
      setProducts(data);
    } catch (err) {
      setError("Failed to load products");
    }
  }

  function resetForm() {
    setEditingId(null);
    setName(""); setGenericName(""); setManufacturer(""); setUnit(""); setPackSize("");
    setBatch(""); setExpiry(""); setPrice(""); setGst("0");
    setReorderLevel("10"); setCategoryId("");
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setGenericName(p.generic_name || "");
    setManufacturer(p.manufacturer || "");
    setUnit(p.unit || "");
    setPackSize(p.pack_size || "");
    setBatch(p.batch_number || "");
    setExpiry(p.expiry_date ? p.expiry_date.split("T")[0] : "");
    setPrice(String(p.unit_price));
    setGst(String(p.gst_rate || 0));
    setReorderLevel(String(p.reorder_level || 10));
    setCategoryId(p.category_id ? String(p.category_id) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        name,
        generic_name: genericName || null,
        manufacturer: manufacturer || null,
        unit: unit || null,
        pack_size: packSize || null,
        batch_number: batch || null,
        expiry_date: expiry || null,
        unit_price: Number(price),
        gst_rate: Number(gst),
        reorder_level: Number(reorderLevel) || 10,
        category_id: categoryId ? Number(categoryId) : null,
      };

      if (editingId) {
        await apiRequest(`/api/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      loadProducts();
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    }
  }

  async function toggleStatus(id: number, currentStatus: number) {
    try {
      await apiRequest(`/api/products/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 }),
      });
      loadProducts();
    } catch (err) {
      setError("Failed to update status");
    }
  }

  async function deleteProduct(id: number, pName: string) {
    if (!confirm(`Delete "${pName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/products/${id}`, { method: "DELETE" });
      loadProducts();
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    }
  }

  return (
    <div className="main-content">
      <h2>Medicine Master</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Medicine" : "Add New Medicine"}</h3>
        <form onSubmit={saveProduct} className="form-grid">
        <label className="form-label-full">
  <span className="form-label-text">Medicine Name *</span>
  <input value={name} onChange={(e) => setName(e.target.value)} required />
</label>

<label className="form-label-full">
  <span className="form-label-text">Generic Name</span>
  <input placeholder="e.g., Paracetamol" value={genericName} onChange={(e) => setGenericName(e.target.value)} />
</label>

<label className="form-label-full">
  <span className="form-label-text">Category</span>
  <SearchableSelect
    options={categories.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` }))}
    value={categoryId}
    onChange={setCategoryId}
    placeholder="Select category..."
  />
</label>

<label className="form-label-full">
  <span className="form-label-text">Manufacturer</span>
  <input placeholder="e.g., Cipla" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
</label>

<label className="form-label-full">
  <span className="form-label-text">Unit</span>
  <select value={unit} onChange={(e) => setUnit(e.target.value)}>
    <option value="" disabled hidden>Select Unit</option>
    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
  </select>
</label>

<label className="form-label-full">
  <span className="form-label-text">Pack Size</span>
  <input placeholder="e.g., 10 Tablets/Strip" value={packSize} onChange={(e) => setPackSize(e.target.value)} />
</label>

<label className="form-label-full">
  <span className="form-label-text">Batch Number</span>
  <input value={batch} onChange={(e) => setBatch(e.target.value)} />
</label>

<label className="form-label-full">
  <span className="form-label-text">Expiry Date</span>
  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
</label>

<label className="form-label-full">
  <span className="form-label-text">Unit Price (₹) *</span>
  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
</label>

<label className="form-label-full">
  <span className="form-label-text">Reorder Level (Min Stock)</span>
  <input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
</label>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Update Medicine" : "Add Medicine"}
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
          <h3>Medicine List</h3>
          <input
            placeholder="Search by name or generic name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "300px" }}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Generic</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Price (₹)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category_name || "-"}</td>
                <td>{p.generic_name || "-"}</td>
                <td>{p.batch_number || "-"}</td>
                <td>{p.expiry_date ? p.expiry_date.split("T")[0] : "-"}</td>
                <td>{p.unit_price}</td>
                <td>
                  <span className={p.is_active ? "badge-active" : "badge-inactive"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn icon-btn-edit" onClick={() => startEdit(p)} title="Edit">
                      <EditIcon />
                    </button>
                    <button
                      className={`icon-btn ${p.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`}
                      onClick={() => toggleStatus(p.id, p.is_active)}
                      title={p.is_active ? "Deactivate" : "Activate"}
                    >
                      <PowerIcon />
                    </button>
                    <button className="icon-btn icon-btn-delete" onClick={() => deleteProduct(p.id, p.name)} title="Delete">
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