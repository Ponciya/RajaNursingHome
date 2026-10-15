import { useEffect, useState, type FormEvent } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { apiRequest } from "../lib/api";

type Patient = {
  id: number;
  patient_code: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  doctor_name: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  village_name: string | null;
  age_category: string | null;
};

type Doctor = { id: number; name: string; };
type Village = { id: number; name: string; code: string; };

const RELATIONS = ["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister", "Guardian", "Other"];

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

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("MALE");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [villageId, setVillageId] = useState("");

  useEffect(() => { loadPatients(); }, [search]);
  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { loadVillages(); }, []);

  async function loadPatients() {
    try {
      const data = await apiRequest<Patient[]>(`/api/patients?search=${search}`);
      setPatients(data);
    } catch (err) { setError("Failed to load patients"); }
  }

  async function loadDoctors() {
    try {
      const data = await apiRequest<Doctor[]>("/api/doctors?active=true");
      setDoctors(data);
    } catch (err) { console.error("Failed to load doctors"); }
  }

  async function loadVillages() {
    try {
      const data = await apiRequest<Village[]>("/api/villages?active=true");
      setVillages(data);
    } catch (err) { console.error("Failed to load villages"); }
  }

  function resetForm() {
    setEditingId(null);
    setName(""); setAge(""); setGender("MALE"); setPhone(""); setAddress(""); setDoctorId("");
    setGuardianName(""); setGuardianRelation(""); setVillageId("");
  }

  function startEdit(p: Patient) {
    setEditingId(p.id);
    setName(p.name);
    setAge(p.age ? String(p.age) : "");
    setGender(p.gender);
    setPhone(p.phone || "");
    setAddress(p.address || "");
    const doc = doctors.find((d) => d.name === p.doctor_name);
    setDoctorId(doc ? String(doc.id) : "");
    setGuardianName(p.guardian_name || "");
    setGuardianRelation(p.guardian_relation || "");
    const vil = villages.find((v) => v.name === p.village_name);
    setVillageId(vil ? String(vil.id) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePatient(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (phone && !/^\d{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    try {
      const payload = {
        name, age: age ? Number(age) : null, gender,
        phone: phone || null, address: address || null,
        doctor_id: doctorId ? Number(doctorId) : null,
        guardian_name: guardianName || null,
        guardian_relation: guardianRelation || null,
        village_id: villageId ? Number(villageId) : null,
      };

      if (editingId) {
        await apiRequest(`/api/patients/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/api/patients", { method: "POST", body: JSON.stringify(payload) });
      }
      resetForm();
      loadPatients();
    } catch (err: any) { setError(err.message || "Failed to save patient"); }
  }

  async function deletePatient(id: number, pName: string) {
    if (!confirm(`Delete patient "${pName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/patients/${id}`, { method: "DELETE" });
      loadPatients();
    } catch (err: any) { setError(err.message || "Failed to delete patient"); }
  }

  return (
    <div className="main-content">
      <h2>Patient Management</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Patient" : "Register New Patient"}</h3>
        <form onSubmit={savePatient} className="form-grid">
          <input placeholder="Patient Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            placeholder="Phone Number (10 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            maxLength={10}
            style={phone.length > 0 && phone.length < 10 ? { borderColor: "#f59e0b" } : {}}
          />

          <input placeholder="Guardian Name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
          <SearchableSelect
            options={RELATIONS.map((r) => ({ value: r, label: r }))}
            value={guardianRelation}
            onChange={setGuardianRelation}
            placeholder="Select Relation..."
          />

          <SearchableSelect
            options={villages.map((v) => ({ value: String(v.id), label: v.name }))}
            value={villageId}
            onChange={setVillageId}
            placeholder="Search village..."
          />
          <input placeholder="Address (Door No, Street) [Optional]" value={address} onChange={(e) => setAddress(e.target.value)} />

          <SearchableSelect
            options={doctors.map((d) => ({ value: String(d.id), label: d.name }))}
            value={doctorId}
            onChange={setDoctorId}
            placeholder="Search doctor..."
          />

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Update Patient" : "Register Patient"}
            </button>
            {editingId && <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Patient List</h3>
          <input placeholder="Search by Name, ID, or Phone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "300px" }} />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age</th><th>Category</th><th>Gender</th>
              <th>Phone</th><th>Village</th><th>Doctor</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td>{p.patient_code}</td>
                <td>{p.name}</td>
                <td>{p.age || "-"}</td>
                <td>{p.age_category || "-"}</td>  
                <td>{p.gender}</td>
                <td>{p.phone || "-"}</td>
                <td>{p.village_name || "-"}</td>
                <td>{p.doctor_name || "-"}</td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn icon-btn-edit" onClick={() => startEdit(p)} title="Edit"><EditIcon /></button>
                    <button className="icon-btn icon-btn-delete" onClick={() => deletePatient(p.id, p.name)} title="Delete"><DeleteIcon /></button>
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