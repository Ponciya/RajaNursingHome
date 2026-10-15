import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { apiRequest } from "../lib/api";

type TypeStat = { type_name: string; count: number; total: number };
type RecentBill = { id: number; bill_number: string; bill_date: string; grand_total: number; patient_name: string };

type DashboardData = {
  today_bills: number;
  today_collection: number;
  type_stats: TypeStat[];
  counts: {
    total_patients: number;
    total_doctors: number;
    total_products: number;
    total_bills: number;
  };
  recent_bills: RecentBill[];
};

type SalesTrend = { label: string; bill_count: number; revenue: number };
type TopMedicine = { medicine_name: string; total_sold: number };

type ChartsData = {
  sales_trend: SalesTrend[];
  top_medicines: TopMedicine[];
  stock_status: { healthy: number; low_stock: number; expiring: number; expired: number };
};

const PIE_COLORS = ["#16a34a", "#d97706", "#f97316", "#dc2626"];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [d, c] = await Promise.all([
          apiRequest<DashboardData>("/api/dashboard/stats"),
          apiRequest<ChartsData>("/api/dashboard/charts"),
        ]);
        setData(d);
        setCharts(c);
      } catch (err) {
        setError("Failed to load dashboard data");
      }
    }
    load();
  }, []);

  if (error) return <div className="main-content"><div className="alert alert-error">{error}</div></div>;
  if (!data || !charts) return <div className="main-content">Loading...</div>;

  const stockPieData = [
    { name: "Healthy", value: charts.stock_status.healthy },
    { name: "Low Stock", value: charts.stock_status.low_stock },
    { name: "Expiring", value: charts.stock_status.expiring },
    { name: "Expired", value: charts.stock_status.expired },
  ].filter((d) => d.value > 0);

  return (
    <div className="main-content">
      <h2>Dashboard</h2>
      <p className="muted" style={{ marginBottom: "20px", fontSize: "0.9rem" }}>
        Welcome to Raja Nursing Home Billing Software
      </p>

      {/* TOP STATS CARDS */}
      <div className="dashboard-cards">
        <div className="stat-card stat-primary">
          <div className="stat-label">Today's Bills</div>
          <div className="stat-value">{data.today_bills}</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-label">Today's Collection</div>
          <div className="stat-value">₹{data.today_collection.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Patients</div>
          <div className="stat-value">{data.counts.total_patients}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Bills</div>
          <div className="stat-value">{data.counts.total_bills}</div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>Quick Actions</h3>
        <div className="quick-actions">
          <Link to="/new-bill" className="btn-primary">➕ Create New Bill</Link>
          <Link to="/patients" className="btn-cancel">👤 Register Patient</Link>
          <Link to="/bill-history" className="btn-cancel">📋 Bill History</Link>
          <Link to="/products" className="btn-cancel">💊 Manage Medicines</Link>
        </div>
      </div>

      {/* SALES TREND - FULL WIDTH */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: "18px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>📈 Last 7 Days Sales Trend</h3>
        <p className="muted" style={{ fontSize: "0.75rem", marginBottom: "12px" }}>Revenue and bills count</p>
        {charts.sales_trend.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "40px" }}>No sales in last 7 days</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.sales_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px" }}
                formatter={(value: any, name: any) => [
                  name === "Revenue" ? `₹${value}` : `${value} bills`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="revenue" stroke="#14324a" strokeWidth={2.5} dot={{ fill: "#14324a", r: 4 }} activeDot={{ r: 6 }} name="Revenue" />
              <Line type="monotone" dataKey="bill_count" stroke="#c9a227" strokeWidth={2} strokeDasharray="5 5" name="Bills" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* TOP MEDICINES + STOCK STATUS */}
      <div className="charts-grid">
        {/* Top Medicines */}
        <div className="card" style={{ padding: "18px 22px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>⚡ Top 5 Fast Moving Medicines</h3>
          <p className="muted" style={{ fontSize: "0.75rem", marginBottom: "12px" }}>Last 30 days</p>
          {charts.top_medicines.length === 0 ? (
            <p className="muted" style={{ textAlign: "center", padding: "40px" }}>No sales in last 30 days</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.top_medicines}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="medicine_name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px" }}
                  formatter={(value: any) => [`${value} units`, "Sold"]}
                />
                <Bar dataKey="total_sold" fill="#14324a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stock Status */}
        <div className="card" style={{ padding: "18px 22px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>📦 Stock Status</h3>
          <p className="muted" style={{ fontSize: "0.75rem", marginBottom: "12px" }}>Current inventory health</p>
          {stockPieData.length === 0 ? (
            <p className="muted" style={{ textAlign: "center", padding: "40px" }}>No stock data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stockPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                >
                  {stockPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TODAY'S BILLS BY TYPE */}
      <div className="card" style={{ padding: "18px 22px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>Today's Bills by Type</h3>
        {data.type_stats.length === 0 ? (
          <p className="muted">No bills today yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Billing Type</th>
                <th>Bills Count</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.type_stats.map((t, i) => (
                <tr key={i}>
                  <td>{t.type_name}</td>
                  <td>{t.count}</td>
                  <td>₹{Number(t.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RECENT BILLS */}
      <div className="card" style={{ padding: "18px 22px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>Recent Bills</h3>
        {data.recent_bills.length === 0 ? (
          <p className="muted">No bills yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill No.</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_bills.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.bill_number}</strong></td>
                  <td>{b.bill_date}</td>
                  <td>{b.patient_name}</td>
                  <td>₹{Number(b.grand_total).toFixed(2)}</td>
                  <td><Link to={`/bills/${b.id}/print`} className="btn-edit">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}