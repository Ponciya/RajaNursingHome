import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";  

type FastMoving = {
  id: number;
  medicine_name: string;
  total_sold: number;
  total_revenue: number;
  bill_count: number;
  last_sold_date: string;
};

type SlowMoving = {
  id: number;
  medicine_name: string;
  total_sold: number;
  last_sold_date: string | null;
  days_since_last_sale: number | null;
  current_stock: number;
};

type ExpiryAlert = {
  id: number;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  days_until_expiry: number;
  quantity: number;
  mrp: number | null;
  purchase_rate: number | null;
  rack_location: string | null;
  supplier_name: string | null;
};

type SupplierPurchase = {
  id: number;
  supplier_name: string;
  code: string;
  total_sold_quantity: number;
  total_revenue: number;
  total_cogs: number;
  profit_loss: number;
  unsold_stock_value: number;
};

type Summary = {
  fast_moving_count: number;
  expiring_soon_count: number;
  expired_count: number;
  low_stock_count: number;
};

type Tab = "summary" | "fast" | "slow" | "expiry" | "supplier";

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("summary");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fastMoving, setFastMoving] = useState<FastMoving[]>([]);
  const [slowMoving, setSlowMoving] = useState<SlowMoving[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [supplierPurchase, setSupplierPurchase] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { user } = useAuth();
const isBillingStaff = user?.role === "BILLING_STAFF";

  useEffect(() => {
    if (tab === "summary") loadSummary();
    else if (tab === "fast") loadFastMoving();
    else if (tab === "slow") loadSlowMoving();
    else if (tab === "expiry") loadExpiry();
    else if (tab === "supplier") loadSupplier();
  }, [tab]);

  async function loadSummary() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<Summary>("/api/reports/summary");
      setSummary(data);
    } catch (err: any) { setError(err.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function loadFastMoving() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<FastMoving[]>("/api/reports/fast-moving?days=30");
      setFastMoving(data);
    } catch (err: any) { setError(err.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function loadSlowMoving() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<SlowMoving[]>("/api/reports/slow-moving?days=30");
      setSlowMoving(data);
    } catch (err: any) { setError(err.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function loadExpiry() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<ExpiryAlert[]>("/api/reports/expiry-alerts?days=180");
      setExpiryAlerts(data);
    } catch (err: any) { setError(err.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function loadSupplier() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<SupplierPurchase[]>("/api/reports/supplier-purchase");
      setSupplierPurchase(data);
    } catch (err: any) { setError(err.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  const getExpiryBadge = (days: number) => {
    if (days < 0) return { label: "EXPIRED", cls: "badge-inactive" };
    if (days <= 30) return { label: `${days} days`, cls: "badge-inactive" };
    if (days <= 90) return { label: `${days} days`, cls: "badge-manual" };
    return { label: `${days} days`, cls: "badge-active" };
  };

  return (
    <div className="main-content">
      <h2>Reports</h2>
      {error && <div className="alert alert-error">{error}</div>}

      {/* TABS */}
      <div className="tabs">
        <button className={`tab ${tab === "summary" ? "active" : ""}`} onClick={() => setTab("summary")}>
          📊 Summary
        </button>
        <button className={`tab ${tab === "fast" ? "active" : ""}`} onClick={() => setTab("fast")}>
          ⚡ Fast Moving
        </button>
        <button className={`tab ${tab === "slow" ? "active" : ""}`} onClick={() => setTab("slow")}>
          🐢 Slow Moving
        </button>
        <button className={`tab ${tab === "expiry" ? "active" : ""}`} onClick={() => setTab("expiry")}>
          ⚠️ Expiry Alerts
        </button>
        {!isBillingStaff && (
        <button className={`tab ${tab === "supplier" ? "active" : ""}`} onClick={() => setTab("supplier")}>
          🏭 Supplier Purchase
        </button>
      )}
      </div>

      {loading && <p style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Loading...</p>}

      {/* SUMMARY TAB */}
      {!loading && tab === "summary" && summary && (
        <div className="dashboard-cards">
          <div className="stat-card stat-primary">
            <div className="stat-label">Fast Moving (30 days)</div>
            <div className="stat-value">{summary.fast_moving_count}</div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-label">Expiring Soon (90 days)</div>
            <div className="stat-value" style={{ color: "#d97706" }}>{summary.expiring_soon_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Expired</div>
            <div className="stat-value" style={{ color: "#dc2626" }}>{summary.expired_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low Stock (≤10)</div>
            <div className="stat-value" style={{ color: "#dc2626" }}>{summary.low_stock_count}</div>
          </div>
        </div>
      )}

      {/* FAST MOVING TAB */}
      {!loading && tab === "fast" && (
        <div className="card">
          <h3>⚡ Fast Moving Items (Last 30 Days)</h3>
          {fastMoving.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "24px" }}>No sales in last 30 days</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Units Sold</th>
                  <th>Bills Count</th>
                  <th>Revenue</th>
                  <th>Last Sold</th>
                </tr>
              </thead>
              <tbody>
                {fastMoving.map((item, i) => (
                  <tr key={item.id}>
                    <td><strong>{i + 1}</strong></td>
                    <td><strong>{item.medicine_name}</strong></td>
                    <td><strong style={{ color: "#16a34a" }}>{item.total_sold}</strong></td>
                    <td>{item.bill_count}</td>
                    <td>₹{Number(item.total_revenue).toFixed(2)}</td>
                    <td>{item.last_sold_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SLOW MOVING TAB */}
      {!loading && tab === "slow" && (
        <div className="card">
          <h3>🐢 Slow Moving Items (Last 30 Days)</h3>
          {slowMoving.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "24px" }}>No slow moving items</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Units Sold</th>
                  <th>Last Sold</th>
                  <th>Days Since Sale</th>
                  <th>Current Stock</th>
                </tr>
              </thead>
              <tbody>
                {slowMoving.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.medicine_name}</strong></td>
                    <td><strong style={{ color: "#d97706" }}>{item.total_sold}</strong></td>
                    <td>{item.last_sold_date || "Never sold"}</td>
                    <td>{item.days_since_last_sale ?? "-"}</td>
                    <td>{item.current_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EXPIRY ALERTS TAB */}
      {!loading && tab === "expiry" && (
        <div className="card">
          <h3>⚠️ Expiry Alerts (Next 6 Months)</h3>
          {expiryAlerts.length === 0 ? (
            <p style={{ color: "#16a34a", textAlign: "center", padding: "24px" }}>
              ✅ No items expiring in the next 6 months!
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Days Left</th>
                  <th>Stock</th>
                  <th>Rack</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {expiryAlerts.map((item) => {
                  const badge = getExpiryBadge(item.days_until_expiry);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.medicine_name}</strong></td>
                      <td>{item.batch_number}</td>
                      <td>{item.expiry_date}</td>
                      <td><span className={badge.cls}>{badge.label}</span></td>
                      <td><strong>{item.quantity}</strong></td>
                      <td>{item.rack_location ? <span className="badge-rack">{item.rack_location}</span> : "-"}</td>
                      <td>{item.supplier_name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

            {/* SUPPLIER PURCHASE TAB (Profit & Loss) */}
            {!loading && tab === "supplier" && (
        <div className="card">
          <h3>🏭 Supplier-wise Profit & Loss Report</h3>
          {supplierPurchase.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "24px" }}>No supplier data available</p>
          ) : (
            <div className="table-scroll-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Sold Qty</th>
                    <th>Total Revenue (₹)</th>
                    <th>Cost of Sold Items (₹)</th>
                    <th>Profit / Loss (₹)</th>
                    <th>Unsold Stock Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPurchase.map((item) => {
                    const isProfit = Number(item.profit_loss) >= 0;
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.supplier_name}</strong><br/>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.code}</span>
                        </td>
                        <td>{Number(item.total_sold_quantity)}</td>
                        <td>₹{Number(item.total_revenue).toFixed(2)}</td>
                        <td>₹{Number(item.total_cogs).toFixed(2)}</td>
                        <td>
                          <strong style={{ color: isProfit ? "#16a34a" : "#dc2626" }}>
                            {isProfit ? "▲" : "▼"} ₹{Math.abs(Number(item.profit_loss)).toFixed(2)}
                          </strong>
                        </td>
                        <td>₹{Number(item.unsold_stock_value).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}