import { useEffect, useState, useRef, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type Village = {
  id: number;
  code: string;
  name: string;
  district: string | null;
  pincode: string | null;
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

export function VillagesPage() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [pincode, setPincode] = useState("");

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadVillages(); }, [search]);

  async function loadVillages() {
    try {
      const data = await apiRequest<Village[]>(`/api/villages?search=${search}`);
      setVillages(data);
    } catch (err) {
      setError("Failed to load villages");
    }
  }

  function resetForm() {
    setEditingId(null);
    setCode(""); setName(""); setDistrict(""); setPincode("");
  }

  function startEdit(v: Village) {
    setEditingId(v.id);
    setCode(v.code);
    setName(v.name);
    setDistrict(v.district || "");
    setPincode(v.pincode || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveVillage(e: FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const payload = { code, name, district, pincode };
      if (editingId) {
        await apiRequest(`/api/villages/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess("Village updated successfully!");
      } else {
        await apiRequest("/api/villages", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Village added successfully!");
      }
      resetForm();
      loadVillages();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save village");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setImporting(true);
    setImportMsg("");
    setError("");
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const result = await apiRequest<{ inserted: number; skipped: number; total: number }>(
        "/api/villages/import",
        {
          method: "POST",
          body: formData,
        }
      );
      setImportMsg(`✅ ${result.inserted} villages imported, ${result.skipped} skipped (Total: ${result.total})`);
      loadVillages();
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function toggleStatus(id: number, current: number) {
    try {
      await apiRequest(`/api/villages/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: current ? 0 : 1 }),
      });
      loadVillages();
    } catch (err) { setError("Failed to update status"); }
  }

  async function deleteVillage(id: number, vName: string) {
    if (!confirm(`Delete "${vName}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/villages/${id}`, { method: "DELETE" });
      loadVillages();
    } catch (err: any) { setError(err.message || "Failed to delete village"); }
  }

  return (
    <div className="main-content">
      <h2>Village Master</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Village" : "Add New Village"}</h3>
        <form onSubmit={saveVillage} className="form-grid">
          <input placeholder="Village Code * (e.g., PAV)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
          <input placeholder="Village Name * (e.g., Pavoorchatram)" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
          <input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Update Village" : "Add Village"}
            </button>
            {editingId && <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
  <h3>Villages List</h3>
  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} style={{ display: "none" }} />
    <button className="btn-cancel" onClick={() => fileInputRef.current?.click()} disabled={importing}>
      {importing ? "Importing..." : "📁 Import CSV"}
    </button>
    <input placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "250px" }} />
  </div>
</div>
{importMsg && <div className="alert alert-success">{importMsg}</div>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>District</th><th>Pincode</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {villages.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>No villages yet. Add the first village above.</td></tr>
            ) : (
              villages.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.code}</strong></td>
                  <td>{v.name}</td>
                  <td>{v.district || "-"}</td>
                  <td>{v.pincode || "-"}</td>
                  <td><span className={v.is_active ? "badge-active" : "badge-inactive"}>{v.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn icon-btn-edit" onClick={() => startEdit(v)} title="Edit"><EditIcon /></button>
                      <button className={`icon-btn ${v.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`} onClick={() => toggleStatus(v.id, v.is_active)} title={v.is_active ? "Deactivate" : "Activate"}><PowerIcon /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => deleteVillage(v.id, v.name)} title="Delete"><DeleteIcon /></button>
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