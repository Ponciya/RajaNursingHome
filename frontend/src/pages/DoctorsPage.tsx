import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";

type Doctor = {
  id: number;
  name: string;
  qualification: string | null;
  is_active: number;
};

// Icons
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const PowerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

export function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDoctors();
  }, []);

  async function loadDoctors() {
    try {
      const data = await apiRequest<Doctor[]>("/api/doctors");
      setDoctors(data);
    } catch (err) {
      setError("Failed to load doctors");
    }
  }

  async function saveDoctor(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/api/doctors/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ name, qualification }),
        });
      } else {
        await apiRequest("/api/doctors", {
          method: "POST",
          body: JSON.stringify({ name, qualification }),
        });
      }
      setName(""); setQualification(""); setEditingId(null);
      loadDoctors();
    } catch (err: any) {
      setError(err.message || "Failed to save doctor");
    }
  }

  function startEdit(doc: Doctor) {
    setEditingId(doc.id);
    setName(doc.name);
    setQualification(doc.qualification || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setQualification("");
  }

  async function toggleStatus(id: number, currentStatus: number) {
    try {
      await apiRequest(`/api/doctors/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 }),
      });
      loadDoctors();
    } catch (err) {
      setError("Failed to update status");
    }
  }

  return (
    <div className="main-content">
      <h2>Doctor Management</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{editingId ? "Edit Doctor" : "Add New Doctor"}</h3>
        <form onSubmit={saveDoctor} className="form-row">
          <input
            placeholder="Doctor Name (e.g., Dr. Nisha)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder="Qualification (Optional)"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            {editingId ? "Update" : "Add Doctor"}
          </button>
          {editingId && (
            <button type="button" className="btn-cancel" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h3>Doctors List</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Qualification</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.name}</td>
                <td>{doc.qualification || "-"}</td>
                <td>
                  <span className={doc.is_active ? "badge-active" : "badge-inactive"}>
                    {doc.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn icon-btn-edit" onClick={() => startEdit(doc)} title="Edit">
                      <EditIcon />
                    </button>
                    <button
                      className={`icon-btn ${doc.is_active ? "icon-btn-deactivate" : "icon-btn-activate"}`}
                      onClick={() => toggleStatus(doc.id, doc.is_active)}
                      title={doc.is_active ? "Deactivate" : "Activate"}
                    >
                      <PowerIcon />
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