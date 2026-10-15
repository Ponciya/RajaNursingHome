import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { SearchableSelect } from "../components/SearchableSelect";

type Supplier = {
  id: number;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  gstin: string | null;
  is_active: number;
  medicine_count?: number;
};

type Medicine = { id: number; name: string; unit: string | null };
type SupplierMedicine = {
  id?: number;
  medicine_id: number | null;
  medicine_name?: string;
  purchase_rate: number | null;
  notes: string | null;
};

const emptyForm = {
  code: "", name: "", contact_person: "", phone: "", email: "",
  address_line1: "", address_line2: "", city: "", district: "", state: "", pincode: "",
  gstin: "", drug_licence_no: "", min_order_value: "", payment_terms: "",
  bank_name: "", account_no: "", ifsc_code: "", notes: "",
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
const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewData, setViewData] = useState<{ supplier: any; medicines: any[] } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [medList, setMedList] = useState<SupplierMedicine[]>([]);

  useEffect(() => { loadSuppliers(); }, [search]);
  useEffect(() => { loadMedicines(); }, []);

  async function loadSuppliers() {
    try {
      const data = await apiRequest<Supplier[]>(`/api/suppliers?search=${search}`);
      setSuppliers(data);
    } catch (err) { setError("Failed to load suppliers"); }
  }

  async function loadMedicines() {
    try {
      const data = await apiRequest<Medicine[]>("/api/products?active=true");
      setMedicines(data);
    } catch (err) { console.error(err); }
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMedList([]);
    setError("");
  }

  function openAdd() {
    resetForm();
    setShowModal(true);
  }

  async function openEdit(s: Supplier) {
    setEditingId(s.id);
    setError("");
    try {
      const data = await apiRequest<{ supplier: any; medicines: any[] }>(`/api/suppliers/${s.id}`);
      setForm({
        code: data.supplier.code,
        name: data.supplier.name,
        contact_person: data.supplier.contact_person || "",
        phone: data.supplier.phone || "",
        email: data.supplier.email || "",
        address_line1: data.supplier.address_line1 || "",
        address_line2: data.supplier.address_line2 || "",
        city: data.supplier.city || "",
        district: data.supplier.district || "",
        state: data.supplier.state || "",
        pincode: data.supplier.pincode || "",
        gstin: data.supplier.gstin || "",
        drug_licence_no: data.supplier.drug_licence_no || "",
        min_order_value: data.supplier.min_order_value ? String(data.supplier.min_order_value) : "",
        payment_terms: data.supplier.payment_terms || "",
        bank_name: data.supplier.bank_name || "",
        account_no: data.supplier.account_no || "",
        ifsc_code: data.supplier.ifsc_code || "",
        notes: data.supplier.notes || "",
      });
      setMedList(data.medicines.map((m: any) => ({
        medicine_id: m.medicine_id,
        medicine_name: m.medicine_name,
        purchase_rate: m.purchase_rate,
        notes: m.notes,
      })));
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to load supplier");
    }
  }

  async function openView(s: Supplier) {
    try {
      const data = await apiRequest<{ supplier: any; medicines: any[] }>(`/api/suppliers/${s.id}`);
      setViewData(data);
      setShowViewModal(true);
    } catch (err: any) { setError(err.message || "Failed to load"); }
  }

  function addMedicineRow() {
    setMedList([...medList, { medicine_id: null, purchase_rate: null, notes: null }]);
  }

  function updateMedRow(index: number, field: keyof SupplierMedicine, value: any) {
    const newList = [...medList];
    if (field === "medicine_id") {
      newList[index] = { ...newList[index], medicine_id: value ? Number(value) : null };
    } else {
      newList[index] = { ...newList[index], [field]: value };
    }
    setMedList(newList);
  }

  function removeMedRow(index: number) {
    setMedList(medList.filter((_, i) => i !== index));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        supplier: {
          ...form,
          min_order_value: form.min_order_value ? Number(form.min_order_value) : null,
        },
        medicines: medList.filter((m) => m.medicine_id),
      };

      if (editingId) {
        await apiRequest(`/api/suppliers/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess("Supplier updated successfully!");
      } else {
        await apiRequest("/api/suppliers", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Supplier added successfully!");
      }
      setShowModal(false);
      resetForm();
      loadSuppliers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/suppliers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadSuppliers();
    } catch (err) { setError("Failed to update status"); }
  }

  async function deleteSupplier(id: number, name: string) {
    if (!confirm(`Delete "${name}"? All linked medicines will also be removed.`)) return;
    try {
      await apiRequest(`/api/suppliers/${id}`, { method: "DELETE" });
      loadSuppliers();
    } catch (err: any) { setError(err.message || "Failed to delete"); }
  }

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>Supplier Master</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Supplier</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Suppliers List</h3>
          <input placeholder="Search by name, code, phone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "300px" }} />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>City</th>
              <th>Medicines</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>No suppliers yet. Click "Add Supplier" to start.</td></tr>
            ) : suppliers.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.code}</strong></td>
                <td>{s.name}</td>
                <td>{s.contact_person || "-"}</td>
                <td>{s.phone || "-"}</td>
                <td>{s.city || "-"}</td>
                <td><span className="badge-rack">{s.medicine_count || 0}</span></td>
                <td><span className={s.is_active ? "badge-active" : "badge-inactive"}>{s.is_active ? "Active" : "Inactive"}</span></td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn icon-btn-view" onClick={() => openView(s)} title="View"><ViewIcon /></button>
                    <button className="icon-btn icon-btn-edit" onClick={() => openEdit(s)} title="Edit"><EditIcon /></button>
                    <button className={`icon-btn ${s.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`} onClick={() => toggleStatus(s.id, s.is_active)} title={s.is_active ? "Deactivate" : "Activate"}><PowerIcon /></button>
                    <button className="icon-btn icon-btn-delete" onClick={() => deleteSupplier(s.id, s.name)} title="Delete"><DeleteIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit Supplier" : "Add New Supplier"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save} className="modal-body">
              <div className="modal-section-title">Basic Information</div>
              <div className="form-grid">
                <label className="form-label-full"><span className="form-label-text">Supplier Code *</span>
                  <input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="e.g., CIP" required /></label>
                <label className="form-label-full"><span className="form-label-text">Supplier Name *</span>
                  <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g., Cipla Ltd." required /></label>
                <label className="form-label-full"><span className="form-label-text">Contact Person</span>
                  <input value={form.contact_person} onChange={(e) => setField("contact_person", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">Phone (10 digits)</span>
                  <input value={form.phone} onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} /></label>
                <label className="form-label-full"><span className="form-label-text">Email</span>
                  <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} /></label>
              </div>

              <div className="modal-section-title">Address</div>
              <div className="form-grid">
                <label className="form-label-full"><span className="form-label-text">Address Line 1</span><input value={form.address_line1} onChange={(e) => setField("address_line1", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">Address Line 2</span><input value={form.address_line2} onChange={(e) => setField("address_line2", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">City</span><input value={form.city} onChange={(e) => setField("city", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">District</span><input value={form.district} onChange={(e) => setField("district", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">State</span><input value={form.state} onChange={(e) => setField("state", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">Pincode</span><input value={form.pincode} onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} /></label>
              </div>

              <div className="modal-section-title">Legal &amp; Licence</div>
              <div className="form-grid">
                <label className="form-label-full"><span className="form-label-text">GSTIN</span><input value={form.gstin} onChange={(e) => setField("gstin", e.target.value.toUpperCase())} /></label>
                <label className="form-label-full"><span className="form-label-text">Drug Licence No.</span><input value={form.drug_licence_no} onChange={(e) => setField("drug_licence_no", e.target.value.toUpperCase())} /></label>
              </div>

              <div className="modal-section-title">Business Terms</div>
              <div className="form-grid">
                <label className="form-label-full"><span className="form-label-text">Min Order Value (₹)</span><input type="number" step="0.01" value={form.min_order_value} onChange={(e) => setField("min_order_value", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">Payment Terms</span><input value={form.payment_terms} onChange={(e) => setField("payment_terms", e.target.value)} placeholder="e.g., 30 days credit" /></label>
              </div>

              <div className="modal-section-title">Bank Details (Optional)</div>
              <div className="form-grid">
                <label className="form-label-full"><span className="form-label-text">Bank Name</span><input value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">Account No.</span><input value={form.account_no} onChange={(e) => setField("account_no", e.target.value)} /></label>
                <label className="form-label-full"><span className="form-label-text">IFSC Code</span><input value={form.ifsc_code} onChange={(e) => setField("ifsc_code", e.target.value.toUpperCase())} /></label>
              </div>

              <div className="modal-section-title">Notes</div>
              <label className="form-label-full">
                <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2}
                  style={{ width: "100%", padding: "10px", border: "1px solid #c5d0da", borderRadius: "4px", fontFamily: "inherit" }} />
              </label>

              {/* MEDICINES SECTION */}
              <div className="modal-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>💊 Medicines Supplied by This Supplier</span>
                <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={addMedicineRow}>+ Add Medicine</button>
              </div>
              {medList.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "12px" }}>No medicines added yet. Click "+ Add Medicine" to add.</p>
              ) : (
                <table className="data-table" style={{ marginTop: "4px" }}>
                  <thead>
                    <tr><th>Medicine</th><th>Purchase Rate ₹</th><th>Notes</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {medList.map((m, i) => (
                      <tr key={i}>
                        <td>
                          <SearchableSelect
                            options={medicines.map((med) => ({ value: String(med.id), label: med.name }))}
                            value={m.medicine_id ? String(m.medicine_id) : ""}
                            onChange={(v) => updateMedRow(i, "medicine_id", v)}
                            placeholder="Search medicine..."
                          />
                        </td>
                        <td>
                          <input type="number" step="0.01" value={m.purchase_rate ?? ""} onChange={(e) => updateMedRow(i, "purchase_rate", e.target.value ? Number(e.target.value) : null)} style={{ width: "100px" }} />
                        </td>
                        <td>
                          <input value={m.notes || ""} onChange={(e) => updateMedRow(i, "notes", e.target.value)} style={{ width: "120px" }} />
                        </td>
                        <td>
                          <button type="button" className="btn-delete" onClick={() => removeMedRow(i)}>X</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {error && <div className="alert alert-error">{error}</div>}

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? "Update Supplier" : "Add Supplier"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && viewData && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 {viewData.supplier.name}</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="view-row"><span className="view-label">Code:</span><span>{viewData.supplier.code}</span></div>
              <div className="view-row"><span className="view-label">Contact:</span><span>{viewData.supplier.contact_person || "-"}</span></div>
              <div className="view-row"><span className="view-label">Phone:</span><span>{viewData.supplier.phone || "-"}</span></div>
              <div className="view-row"><span className="view-label">Email:</span><span>{viewData.supplier.email || "-"}</span></div>
              <div className="view-row"><span className="view-label">City:</span><span>{viewData.supplier.city || "-"}</span></div>
              <div className="view-row"><span className="view-label">GSTIN:</span><span>{viewData.supplier.gstin || "-"}</span></div>
              <div className="view-row"><span className="view-label">Payment:</span><span>{viewData.supplier.payment_terms || "-"}</span></div>

              <div className="modal-section-title">💊 Medicines Supplied</div>
              {viewData.medicines.length === 0 ? (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: "12px" }}>No medicines linked</p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Medicine</th><th>Purchase Rate</th><th>Notes</th></tr></thead>
                  <tbody>
                    {viewData.medicines.map((m: any, i: number) => (
                      <tr key={i}>
                        <td>{m.medicine_name}</td>
                        <td>{m.purchase_rate ? `₹${m.purchase_rate}` : "-"}</td>
                        <td>{m.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}