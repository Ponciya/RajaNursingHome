import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import { SearchableSelect } from "../components/SearchableSelect";

type InventoryItem = {
  id: number;
  medicine_id: number;
  medicine_name: string;
  category_name: string | null;
  unit: string | null;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_rate: number | null;
  mrp: number | null;
  selling_price: number | null;
  rack_location: string | null;
  rack_id: number | null;
  rack_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  is_active: number;
};

type Medicine = { id: number; name: string; unit: string | null };
type Rack = { id: number; name: string; code: string };
type Supplier = { id: number; name: string; code: string };

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

export function MedicineInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [medicineId, setMedicineId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [mrp, setMrp] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [rackId, setRackId] = useState("");

  const { user } = useAuth();
  const isBillingStaff = user?.role === "BILLING_STAFF";

  useEffect(() => { loadItems(); }, [search]);
  useEffect(() => { loadMedicines(); loadRacks(); loadSuppliers(); }, []);

  async function loadItems() {
    try {
      const data = await apiRequest<InventoryItem[]>(`/api/inventory?search=${search}`);
      setItems(data);
    } catch (err) { setError("Failed to load inventory"); }
  }

  async function loadMedicines() {
    try {
      const data = await apiRequest<Medicine[]>("/api/products?active=true");
      setMedicines(data);
    } catch (err) { console.error(err); }
  }

  async function loadRacks() {
    try {
      const data = await apiRequest<Rack[]>("/api/racks?active=true");
      setRacks(data);
    } catch (err) { console.error(err); }
  }

  async function loadSuppliers() {
    try {
      const data = await apiRequest<Supplier[]>("/api/suppliers");
      setSuppliers(data.filter((s: any) => s.is_active === 1));
    } catch (err) { console.error(err); }
  }

  function resetForm() {
    setEditingId(null);
    setMedicineId(""); setSupplierId(""); setBatchNumber(""); setExpiryDate("");
    setQuantity(""); setPurchaseRate(""); setMrp(""); setSellingPrice(""); setRackId("");
    setError("");
  }

  function openStockIn() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingId(item.id);
    setMedicineId(String(item.medicine_id));
    setSupplierId(item.supplier_id ? String(item.supplier_id) : "");
    setBatchNumber(item.batch_number);
    setExpiryDate(item.expiry_date);
    setQuantity(String(item.quantity));
    setPurchaseRate(item.purchase_rate ? String(item.purchase_rate) : "");
    setMrp(item.mrp ? String(item.mrp) : "");
    setSellingPrice(item.selling_price ? String(item.selling_price) : "");
    setRackId(item.rack_id ? String(item.rack_id) : "");
    setShowModal(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await apiRequest(`/api/inventory/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            quantity: Number(quantity),
            purchase_rate: purchaseRate ? Number(purchaseRate) : null,
            mrp: mrp ? Number(mrp) : null,
            selling_price: sellingPrice ? Number(sellingPrice) : null,
            expiry_date: expiryDate,
            rack_id: rackId ? Number(rackId) : null,
            supplier_id: supplierId ? Number(supplierId) : null,
          }),
        });
        setSuccess("Stock updated!");
      } else {
        await apiRequest("/api/inventory", {
          method: "POST",
          body: JSON.stringify({
            medicine_id: Number(medicineId),
            batch_number: batchNumber,
            expiry_date: expiryDate,
            quantity: Number(quantity),
            purchase_rate: purchaseRate ? Number(purchaseRate) : null,
            mrp: mrp ? Number(mrp) : null,
            selling_price: sellingPrice ? Number(sellingPrice) : null,
            rack_id: rackId ? Number(rackId) : null,
            supplier_id: supplierId ? Number(supplierId) : null,
          }),
        });
        setSuccess("Stock added!");
      }
      setShowModal(false);
      resetForm();
      loadItems();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/inventory/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadItems();
    } catch (err) { setError("Failed to update status"); }
  }

  async function deleteItem(id: number, medicineName: string, batch: string) {
    if (!confirm(`Delete "${medicineName}" (Batch: ${batch})? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/inventory/${id}`, { method: "DELETE" });
      loadItems();
    } catch (err: any) { setError(err.message || "Failed to delete"); }
  }

  const isLowStock = (qty: number) => qty <= 10;
  const isExpiringSoon = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 90 && diffDays >= 0;
  };
  const isExpired = (expiryStr: string) => new Date(expiryStr) < new Date();

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>Medicine Inventory</h2>
        {!isBillingStaff && (
          <button className="btn-primary" onClick={openStockIn}>+ Stock In</button>
        )}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Stock List</h3>
          <input
            placeholder="Search by medicine, batch, or rack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "300px" }}
          />
        </div>
        <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Category</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Stock</th>
              <th>Rack</th>
              <th>Supplier</th>
              {!isBillingStaff && <th>Purchase ₹</th>}
              {!isBillingStaff && <th>MRP ₹</th>}
              <th>Selling ₹</th>
              <th>Status</th>
              {!isBillingStaff && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={isBillingStaff ? 9 : 12} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>No inventory yet.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td><strong>{it.medicine_name}</strong></td>
                  <td>{it.category_name || "-"}</td>
                  <td>{it.batch_number}</td>
                  <td>
                    {it.expiry_date}
                    {isExpired(it.expiry_date) && <span className="badge-inactive" style={{ marginLeft: "6px" }}>Expired</span>}
                    {!isExpired(it.expiry_date) && isExpiringSoon(it.expiry_date) && <span className="badge-manual" style={{ marginLeft: "6px" }}>Expiring</span>}
                  </td>
                  <td>
                    <strong style={{ color: isLowStock(it.quantity) ? "#dc2626" : "#0f172a" }}>
                      {it.quantity}
                    </strong>
                    {isLowStock(it.quantity) && <span style={{ fontSize: "0.7rem", color: "#dc2626", marginLeft: "4px" }}>LOW</span>}
                  </td>
                  <td>
                    {it.rack_name ? <span className="badge-rack">{it.rack_name}</span> : "-"}
                  </td>
                  <td>{it.supplier_name || "-"}</td>
                  {!isBillingStaff && <td>{it.purchase_rate ? `₹${it.purchase_rate}` : "-"}</td>}
                  {!isBillingStaff && <td>{it.mrp ? `₹${it.mrp}` : "-"}</td>}
                  <td><strong style={{ color: "#166534" }}>{it.selling_price ? `₹${it.selling_price}` : "-"}</strong></td>
                  <td><span className={it.is_active ? "badge-active" : "badge-inactive"}>{it.is_active ? "Active" : "Inactive"}</span></td>
                  {!isBillingStaff && (
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn icon-btn-edit" onClick={() => openEdit(it)} title="Edit"><EditIcon /></button>
                        <button className={`icon-btn ${it.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`} onClick={() => toggleStatus(it.id, it.is_active)} title={it.is_active ? "Deactivate" : "Activate"}><PowerIcon /></button>
                        <button className="icon-btn icon-btn-delete" onClick={() => deleteItem(it.id, it.medicine_name, it.batch_number)} title="Delete"><DeleteIcon /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit Stock" : "Stock In"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save} className="modal-body">
              {!editingId && (
                <label className="form-label-full">
                  <span className="form-label-text">Medicine *</span>
                  <SearchableSelect
                    options={medicines.map((m) => ({ value: String(m.id), label: m.name }))}
                    value={medicineId}
                    onChange={setMedicineId}
                    placeholder="Search medicine..."
                  />
                </label>
              )}

              <label className="form-label-full">
                <span className="form-label-text">Supplier</span>
                <SearchableSelect
                  options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Search supplier..."
                />
              </label>

              {!editingId && (
                <label className="form-label-full">
                  <span className="form-label-text">Batch Number *</span>
                  <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required />
                </label>
              )}

              <label className="form-label-full">
                <span className="form-label-text">Expiry Date *</span>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
              </label>

              <label className="form-label-full">
                <span className="form-label-text">{editingId ? "Current Stock *" : "Quantity *"}</span>
                <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </label>

              <label className="form-label-full">
                <span className="form-label-text">Rack Location</span>
                <SearchableSelect
                  options={racks.map((r) => ({ value: String(r.id), label: r.name }))}
                  value={rackId}
                  onChange={setRackId}
                  placeholder="Search rack..."
                />
              </label>

              <label className="form-label-full">
                <span className="form-label-text">Purchase Rate (₹)</span>
                <input type="number" step="0.01" value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} />
              </label>

              <label className="form-label-full">
                <span className="form-label-text">MRP (₹)</span>
                <input type="number" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} />
              </label>

              <label className="form-label-full">
                <span className="form-label-text">Selling Price (₹) *</span>
                <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
              </label>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? "Update" : "Add Stock"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}