import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/api";

type Bill = {
  id: number;
  bill_number: string;
  bill_date: string;
  bill_time: string;
  grand_total: number;
  status: string;
  patient_name: string;
  patient_code: string;
  doctor_name: string | null;
  billing_type_name: string;
};

export function BillHistoryPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBills();
  }, []);

  async function loadBills() {
    try {
      const data = await apiRequest<Bill[]>("/api/bills");
      setBills(data);
    } catch (err) {
      setError("Failed to load bills");
    }
  }

  const filtered = bills.filter((b) =>
    b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
    b.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.doctor_name && b.doctor_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="main-content">
      <h2>Bill History</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>All Completed Bills</h3>
          <input
            placeholder="Search by Bill No, Patient, or Doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "350px" }}
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Bill No.</th>
              <th>Date</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Billing Type</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>
                  No bills found
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.bill_number}</strong></td>
                  <td>{b.bill_date} {b.bill_time?.slice(0, 5)}</td>
                  <td>{b.patient_code} - {b.patient_name}</td>
                  <td>{b.doctor_name || "-"}</td>
                  <td>{b.billing_type_name}</td>
                  <td><strong>₹{Number(b.grand_total).toFixed(2)}</strong></td>
                  <td>
                    <Link to={`/bills/${b.id}/print`} className="btn-edit" style={{ textDecoration: "none" }}>
                      View
                    </Link>
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