import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

type Bill = {
  id: number;
  bill_number: string;
  bill_date: string;
  bill_time: string;
  patient_name: string;
  patient_code: string;
  patient_age: number | null;
  patient_gender: string;
  patient_phone: string;
  patient_address: string;
  doctor_name: string | null;
  billing_type_name: string;
  subtotal: number;
  grand_total: number;
  status: string;
};

type BillItem = {
  id: number;
  line_no: number;
  description: string;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type HospitalSettings = {
  hospital_name: string;
  address_line1: string;
  address_line2: string;
  landline: string;
  phone: string;
  gstin: string | null;
  drug_licence_no: string | null;
};

export function PrintBillPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [hospital, setHospital] = useState<HospitalSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const billData = await apiRequest<{ bill: Bill; items: BillItem[] }>(`/api/bills/${id}`);
        setBill(billData.bill);
        setItems(billData.items);
        // Try to load hospital settings
        try {
          const h = await apiRequest<HospitalSettings>("/api/hospital/settings");
          setHospital(h);
        } catch {
          // If not available, use defaults
          setHospital({
            hospital_name: "RAJA NURSING HOME",
            address_line1: "10/196A, Surandai Road",
            address_line2: "Pavoorchatram - 627808",
            landline: "04633 251783",
            phone: "9489702674",
            gstin: null,
            drug_licence_no: null,
          });
        }
      } catch (err) {
        setError("Failed to load bill");
      }
    }
    loadData();
  }, [id]);

  if (error) {
    return (
      <div className="main-content">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!bill || !hospital) {
    return <div className="main-content">Loading...</div>;
  }

  const totalItems = items.length;
  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity), 0);
  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <div>
      {/* Action buttons - hidden in print */}
      <div className="no-print" style={{ padding: "16px 24px", display: "flex", gap: "12px", background: "#fff", borderBottom: "1px solid #e2e8f0", alignItems: "center", flexWrap: "wrap" }}>
  <button className="btn-primary" onClick={() => window.print()}>
    🖨️ Print Bill
  </button>
  <button className="btn-cancel" onClick={() => navigate("/bill-history")}>
    ← Back to History
  </button>
 
</div>

      {/* Print content */}
      <div className="print-bill-container">
        <div className="print-bill">
          {/* Header */}
          <div className="bill-header">
  <div className="bill-header-top">
    <img src="/billlogo2.png" alt="Logo" className="bill-logo" />
    <div className="bill-hospital-name">{hospital.hospital_name}</div>
  </div>
  <div className="bill-address">{hospital.address_line1}</div>
  <div className="bill-address">{hospital.address_line2}</div>
  <div className="bill-contact">
    Landline: {hospital.landline} | Phone: {hospital.phone}
  </div>
  {hospital.gstin && <div className="bill-license">GSTIN: {hospital.gstin}</div>}
  {hospital.drug_licence_no && <div className="bill-license">DL No: {hospital.drug_licence_no}</div>}
</div>

          <div className="bill-divider" />

          {/* Bill details */}
          <div className="bill-details-grid">
  <div>
    <div><strong>Bill No:</strong> {bill.bill_number}</div>
    <div><strong>Doctor:</strong> {bill.doctor_name || "-"}</div>
    <div><strong>Patient:</strong> {bill.patient_name}</div>
    <div><strong>Patient ID:</strong> {bill.patient_code}</div>
    <div>
      <strong>Age / Gender:</strong>{" "}
      {bill.patient_age || "-"} / {bill.patient_gender || "-"}
    </div>
  </div>
  <div style={{ textAlign: "right" }}>
    <div><strong>Date:</strong> {formatDate(bill.bill_date)}</div>
    <div><strong>Time:</strong> {bill.bill_time?.slice(0, 5)}</div>
  </div>
</div>

          <div className="bill-divider" />

          {/* Items table */}
          <table className="bill-table">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>Qty</th>
                <th>Description</th>
                <th style={{ width: "90px" }}>Batch</th>
                <th style={{ width: "90px" }}>Exp Dt</th>
                <th style={{ width: "90px", textAlign: "right" }}>Rate</th>
                <th style={{ width: "100px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td>{item.description}</td>
                  <td>{item.batch_number || "-"}</td>
                  <td>{item.expiry_date ? formatDate(item.expiry_date) : "-"}</td>
                  <td style={{ textAlign: "right" }}>{Number(item.unit_price).toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>{Number(item.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bill-divider" />

          {/* Totals */}
          <div className="bill-totals">
            <div className="bill-total-row">
              <span>Items: {totalItems}</span>
              <span>Quantity: {totalQty}</span>
              <span className="bill-grand-total">Total Rs. {Number(bill.grand_total).toFixed(2)}</span>
            </div>
          </div>

          <div className="bill-divider" />

          {/* Footer */}
          {/* Footer */}
<div className="bill-footer">
  <div className="bill-disclaimer">
  <strong>முக்கிய குறிப்பு:</strong> மருத்துவர் ஆலோசனைப்படி மருந்து உட்கொள்ளவும்
  </div>

  <p className="bill-warning" style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '8px' }}>
    குழந்தைகள் கைக்கு எட்டாத இடத்தில் மருந்துகளை வைக்கவும். <br />
    மருத்துவர் கூறியபடி மாத்திரைகளை உட்கொள்ளவும். ஏதேனும் பிரச்சினை ஏற்பட்டால் உடனே மருத்துவரை அணுகவும்.
  </p>

  <div className="bill-tamil-blessing">
  “நலமான வாழ்விற்கு, நம்பிக்கையான மருத்துவ சேவை.”
  </div>
  <div className="bill-thankyou">
  நன்றி!
  </div>
  <div className="bill-signature">Authorized Signature</div>
</div>
        </div>
      </div>
    </div>
  );
}