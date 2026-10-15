import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { SearchableSelect } from "../components/SearchableSelect";

type Patient = { id: number; patient_code: string; name: string; };
type Doctor = { id: number; name: string; };
type BillingType = { id: number; name: string; bill_prefix: string; };
type Product = { id: number; name: string; unit: string | null; };
type Service = { id: number; name: string; unit_price: number; };
type Village = { id: number; name: string; code: string; };

type Batch = {
  id: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  rack_location: string | null;
  mrp: number | null;
  purchase_rate: number | null;
  selling_price: number | null;

};

type BillItem = {
  item_kind: "PRODUCT" | "SERVICE" | "MANUAL";
  product_id: number | null;
  service_id: number | null;
  description: string;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_price: number;
  rack_location?: string | null;
};

const RELATIONS = ["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister", "Guardian", "Other"];

export function NewBillPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [billingTypes, setBillingTypes] = useState<BillingType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedBillingType, setSelectedBillingType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedBill, setCompletedBill] = useState<{ id: number; bill_no: string } | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualRate, setManualRate] = useState("");

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Product | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // NEW: Add Patient Modal states
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "", age: "", gender: "MALE", phone: "",
    guardian_name: "", guardian_relation: "", village_id: "", address: "",
  });
  const [patientError, setPatientError] = useState("");
  const [savingPatient, setSavingPatient] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, d, bt, pr, sv, vl] = await Promise.all([
          apiRequest<Patient[]>("/api/patients"),
          apiRequest<Doctor[]>("/api/doctors?active=true"),
          apiRequest<BillingType[]>("/api/bills/types"),
          apiRequest<Product[]>("/api/products?active=true"),
          apiRequest<Service[]>("/api/services?active=true"),
          apiRequest<Village[]>("/api/villages?active=true"),
        ]);
        setPatients(p); setDoctors(d); setBillingTypes(bt); setProducts(pr); setServices(sv); setVillages(vl);

        const pharmacyType = bt.find((t) => t.bill_prefix === "RN-PH");
        if (pharmacyType) setSelectedBillingType(String(pharmacyType.id));
      } catch (err) {
        setError("Failed to load data");
      }
    }
    loadData();
  }, []);

  async function reloadPatients() {
    try {
      const p = await apiRequest<Patient[]>("/api/patients");
      setPatients(p);
      return p;
    } catch (err) { return []; }
  }

  async function handleAddPatient(e: FormEvent) {
    e.preventDefault();
    setPatientError("");
    setSavingPatient(true);
    try {
      const result = await apiRequest<{ id: number; patient_code: string; name: string }>("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          name: patientForm.name,
          age: patientForm.age ? Number(patientForm.age) : null,
          gender: patientForm.gender,
          phone: patientForm.phone || null,
          guardian_name: patientForm.guardian_name || null,
          guardian_relation: patientForm.guardian_relation || null,
          village_id: patientForm.village_id ? Number(patientForm.village_id) : null,
          address: patientForm.address || null,
        }),
      });
      // Reload patients and auto-select new patient
      await reloadPatients();
      setSelectedPatient(String(result.id));
      setShowPatientModal(false);
      setPatientForm({ name: "", age: "", gender: "MALE", phone: "", guardian_name: "", guardian_relation: "", village_id: "", address: "" });
    } catch (err: any) {
      setPatientError(err.message || "Failed to add patient");
    } finally {
      setSavingPatient(false);
    }
  }

  async function handleProductSelect(productId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setSelectedMedicine(product);
    setLoadingBatches(true);
    setShowBatchModal(true);

    try {
      const data = await apiRequest<Batch[]>(`/api/inventory/medicine/${productId}/batches`);
      setBatches(data);
    } catch (err) {
      setError("Failed to load batches");
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }

  function addBatchToBill(batch: Batch) {
    if (!selectedMedicine) return;
    setItems([...items, {
      item_kind: "PRODUCT",
      product_id: selectedMedicine.id,
      service_id: null,
      description: selectedMedicine.name,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: 1,
      unit_price: batch.selling_price || batch.mrp || 0,  // Selling price first, fallback to MRP
      rack_location: batch.rack_location,
    }]);
    setShowBatchModal(false);
    setSelectedMedicine(null);
    setBatches([]);
    setSelectedProduct("");
  }

  function addService(serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setItems([...items, {
      item_kind: "SERVICE",
      product_id: null,
      service_id: service.id,
      description: service.name,
      batch_number: null,
      expiry_date: null,
      quantity: 1,
      unit_price: service.unit_price,
      rack_location: null,
    }]);
  }

  function addManualItem(e: FormEvent) {
    e.preventDefault();
    if (!manualDesc.trim() || !manualRate) {
      setError("Please fill Description and Rate for manual item");
      return;
    }
    setItems([...items, {
      item_kind: "MANUAL",
      product_id: null,
      service_id: null,
      description: manualDesc.trim(),
      batch_number: null,
      expiry_date: null,
      quantity: Number(manualQty) || 1,
      unit_price: Number(manualRate) || 0,
      rack_location: null,
    }]);
    setManualDesc("");
    setManualQty("1");
    setManualRate("");
    setError("");
    setShowManual(false);
  }

  function updateItem(index: number, field: keyof BillItem, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  async function completeBill(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor || !selectedBillingType || items.length === 0) {
      setError("Please fill all details and add at least one item");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await apiRequest<{ id: number; bill_no: string }>("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(selectedPatient),
          doctor_id: Number(selectedDoctor),
          billing_type_id: Number(selectedBillingType),
          items: items,
        }),
      });
      setCompletedBill(result);
    } catch (err: any) {
      setError(err.message || "Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedPatient("");
    setSelectedDoctor("");
    setSelectedProduct("");
    setSelectedService("");
    setItems([]);
    setCompletedBill(null);
    setSubmitting(false);
    setError("");
    setShowManual(false);
    setManualDesc("");
    setManualQty("1");
    setManualRate("");
    const pharmacyType = billingTypes.find((t) => t.bill_prefix === "RN-PH");
    if (pharmacyType) setSelectedBillingType(String(pharmacyType.id));
  }

  if (completedBill) {
    return (
      <div className="main-content">
        <div className="card" style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
          <h3 style={{ fontSize: "1.6rem", marginBottom: "12px", color: "#166534" }}>
            Bill Completed Successfully!
          </h3>
          <p style={{ fontSize: "1.1rem", marginBottom: "8px", color: "#475569" }}>Bill Number</p>
          <p style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "32px", color: "#0f172a" }}>
            {completedBill.bill_no}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" style={{ height: "46px", padding: "0 24px" }} onClick={() => navigate(`/bills/${completedBill.id}/print`)}>
              🖨️ Print Bill
            </button>
            <button className="btn-cancel" style={{ height: "46px", padding: "0 24px" }} onClick={resetForm}>
              ➕ Create Another Bill
            </button>
            <button className="btn-cancel" style={{ height: "46px", padding: "0 24px" }} onClick={() => navigate("/bill-history")}>
              📋 View in History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h2>Create New Bill</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={completeBill}>
        <div className="card">
          <h3>Patient & Doctor Details</h3>
          <div className="form-grid">
            <label>Patient
              <div className="input-with-add">
                <SearchableSelect
                  options={patients.map((p) => ({ value: String(p.id), label: `${p.patient_code} - ${p.name}` }))}
                  value={selectedPatient}
                  onChange={setSelectedPatient}
                  placeholder="Search patient..."
                />
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => setShowPatientModal(true)}
                  title="Add New Patient"
                >
                  + Add New
                </button>
              </div>
            </label>
            <label>Doctor
              <SearchableSelect
                options={doctors.map((d) => ({ value: String(d.id), label: d.name }))}
                value={selectedDoctor}
                onChange={setSelectedDoctor}
                placeholder="Search doctor..."
              />
            </label>
            <label>Billing Type
              <SearchableSelect
                options={billingTypes.filter((bt) => bt.bill_prefix === "RN-PH").map((bt) => ({
                  value: String(bt.id),
                  label: bt.name,
                }))}
                value={selectedBillingType}
                onChange={setSelectedBillingType}
                placeholder="Pharmacy / Medicine Billing"
              />
            </label>
          </div>
        </div>

        <div className="card">
          <h3>Bill Items</h3>

          <div className="form-row" style={{ marginBottom: "12px", gap: "12px" }}>
            <SearchableSelect
              options={products.map((p) => ({ value: String(p.id), label: p.name }))}
              value={selectedProduct}
              onChange={(val) => {
                if (val) handleProductSelect(Number(val));
              }}
              placeholder="+ Add Medicine / Product"
            />
            <SearchableSelect
              options={services.map((s) => ({ value: String(s.id), label: `${s.name} - ₹${s.unit_price}` }))}
              value={selectedService}
              onChange={(val) => {
                setSelectedService(val);
                if (val) {
                  addService(Number(val));
                  setTimeout(() => setSelectedService(""), 100);
                }
              }}
              placeholder="+ Add Service"
            />
          </div>

          <div className="manual-entry-wrapper">
            {!showManual ? (
              <button type="button" className="btn-manual" onClick={() => setShowManual(true)}>
                ✏️ Add Manual Item (Dropdown la illatha item)
              </button>
            ) : (
              <div className="manual-entry-box">
                <div className="manual-entry-header">
                  <span>✏️ Manual Item Entry</span>
                  <button type="button" className="manual-close" onClick={() => { setShowManual(false); setManualDesc(""); setManualQty("1"); setManualRate(""); }}>
                    ✕
                  </button>
                </div>
                <div className="manual-entry-fields">
                  <input placeholder="Item Description *" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} autoFocus />
                  <input type="number" min="1" placeholder="Qty" value={manualQty} onChange={(e) => setManualQty(e.target.value)} style={{ width: "90px" }} />
                  <input type="number" step="0.01" placeholder="Rate ₹" value={manualRate} onChange={(e) => setManualRate(e.target.value)} style={{ width: "120px" }} />
                  <button type="button" className="btn-primary" onClick={addManualItem}>Add Item</button>
                </div>
              </div>
            )}
          </div>

          <table className="data-table" style={{ marginTop: "16px" }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>No items added yet. Use dropdowns or manual entry above.</td></tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td>
                      <span className={
                        item.item_kind === "PRODUCT" ? "badge-active"
                        : item.item_kind === "SERVICE" ? "badge-inactive"
                        : "badge-manual"
                      }>
                        {item.item_kind === "PRODUCT" ? "Medicine" : item.item_kind === "SERVICE" ? "Service" : "Manual"}
                      </span>
                    </td>
                    <td>{item.batch_number || "-"}</td>
                    <td>{item.expiry_date || "-"}</td>
                    <td>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} style={{ width: "70px" }} />
                    </td>
                    <td>
                      <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))} style={{ width: "100px" }} />
                    </td>
                    <td>₹{(item.quantity * item.unit_price).toFixed(2)}</td>
                    <td>
                      <button type="button" className="btn-delete" onClick={() => removeItem(index)}>X</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Total Amount: ₹{subtotal.toFixed(2)}</h3>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : "Complete Bill"}
          </button>
        </div>
      </form>

      {/* BATCH SELECTION MODAL */}
      {showBatchModal && selectedMedicine && (
        <div className="modal-overlay" onClick={() => { setShowBatchModal(false); setSelectedMedicine(null); setSelectedProduct(""); }}>
          <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📍 Select Batch - {selectedMedicine.name}</h3>
              <button className="modal-close" onClick={() => { setShowBatchModal(false); setSelectedMedicine(null); setSelectedProduct(""); }}>✕</button>
            </div>
            <div className="modal-body">
              {loadingBatches ? (
                <p style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Loading batches...</p>
              ) : batches.length === 0 ? (
                <div className="alert alert-error">
                  ⚠️ Intha medicine-ku <strong>stock illa</strong>. Mudhalla Inventory page la Stock In pannunga.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th>Stock</th>
                      <th>📍 Rack</th>
                      <th>Selling ₹</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.batch_number}</strong></td>
                        <td>{b.expiry_date}</td>
                        <td>
                          <strong style={{ color: b.quantity <= 10 ? "#dc2626" : "#0f172a" }}>
                            {b.quantity}
                          </strong>
                        </td>
                        <td>
                          {b.rack_location ? (
                            <span className="badge-rack">{b.rack_location}</span>
                          ) : <span style={{ color: "#94a3b8" }}>Not Set</span>}
                        </td>
                       <td>{b.selling_price ? `₹${b.selling_price}` : (b.mrp ? `₹${b.mrp}` : "-")}</td>
                        <td>
                          <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => addBatchToBill(b)}>
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PATIENT MODAL */}
      {showPatientModal && (
        <div className="modal-overlay" onClick={() => setShowPatientModal(false)}>
          <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Register New Patient</h3>
              <button className="modal-close" onClick={() => setShowPatientModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPatient} className="modal-body">
              <div className="form-grid">
                <input
                  placeholder="Patient Name *"
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                  required
                />
                <input
                  placeholder="Age"
                  type="number"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                />
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  placeholder="Phone (10 digits)"
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  maxLength={10}
                />
                <input
                  placeholder="Guardian Name"
                  value={patientForm.guardian_name}
                  onChange={(e) => setPatientForm({ ...patientForm, guardian_name: e.target.value })}
                />
                <select
                  value={patientForm.guardian_relation}
                  onChange={(e) => setPatientForm({ ...patientForm, guardian_relation: e.target.value })}
                >
                  <option value="" disabled hidden>Select Relation</option>
                  {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <SearchableSelect
                  options={villages.map((v) => ({ value: String(v.id), label: v.name }))}
                  value={patientForm.village_id}
                  onChange={(val) => setPatientForm({ ...patientForm, village_id: val })}
                  placeholder="Search village..."
                />
                <input
                  placeholder="Address (Optional)"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                />
              </div>

              {patientError && <div className="alert alert-error">{patientError}</div>}

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowPatientModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingPatient}>
                  {savingPatient ? "Saving..." : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}