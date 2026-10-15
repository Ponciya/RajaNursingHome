import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AppLayout() {
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime = (d: Date) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${m}:${s} ${ampm}`;
  };

  return (
    <div className="shell">
      <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/billlogo2.png" alt="RNH Logo" />
      </div>
  
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/doctors" className={({ isActive }) => (isActive ? "active" : "")}>
            Doctors
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => (isActive ? "active" : "")}>
            Patients
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
            Products / Medicines
          </NavLink>
          <NavLink to="/new-bill" className={({ isActive }) => (isActive ? "active" : "")}>
            New Bill
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => (isActive ? "active" : "")}>
            Services
          </NavLink>
          <NavLink to="/bill-history" className={({ isActive }) => (isActive ? "active" : "")}>
            Bill History
          </NavLink>

          {/* MASTERS SECTION */}
        <div className="nav-section-title">Masters</div>
          <NavLink to="/medicine-categories" className={({ isActive }) => (isActive ? "active" : "")}>
               Medicine Categories
          </NavLink>
          <NavLink to="/villages" className={({ isActive }) => (isActive ? "active" : "")}>
                Villages
          </NavLink>
          <NavLink to="/age-categories" className={({ isActive }) => (isActive ? "active" : "")}>
              Age Categories
          </NavLink>
          <NavLink to="/racks" className={({ isActive }) => (isActive ? "active" : "")}>
             Racks
          </NavLink>
          <NavLink to="/suppliers" className={({ isActive }) => (isActive ? "active" : "")}>
             Suppliers
          </NavLink>

          {/* INVENTORY SECTION */}
          <div className="nav-section-title">Inventory</div>
            <NavLink to="/inventory" className={({ isActive }) => (isActive ? "active" : "")}>
                Medicine Stock
            </NavLink>

          {/* REPORTS SECTION */}
          <div className="nav-section-title">Reports</div>
            <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>
                 Reports
            </NavLink>
            
            
         {/* SETTINGS SECTION */}
        <div className="nav-section-title">Settings</div>
        {user?.role === "ADMIN" && (
  <>
    <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>
      Users
    </NavLink>
    <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
      Settings
    </NavLink>
  </>
)}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
        <div className="topbar-left">
  <div className="topbar-logo">
    <img src="/billlogo2.png" alt="RNH Logo" />
  </div>
  <div className="topbar-text">
    <div className="topbar-title">Raja Nursing Home</div>
    <div className="topbar-subtitle">Billing Software</div>
  </div>
</div>
          <div className="topbar-right">
            <div className="datetime">
              <span className="datetime-date">{formatDate(now)}</span>
              <span className="datetime-time">{formatTime(now)}</span>
            </div>
            <button onClick={logout} className="logout-btn">
              <span>Sign out</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </header>
        <div className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}