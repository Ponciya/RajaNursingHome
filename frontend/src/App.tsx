import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AdminRoute, GuestRoute, ProtectedRoute } from "./components/RouteGuards";
import { AuthProvider } from "./lib/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
// ... imports
import { DoctorsPage } from "./pages/DoctorsPage";
import { PatientsPage } from "./pages/PatientsPage";
import { ProductsPage } from "./pages/ProductsPage"; // <-- Phase 6 ku ithu venum
import { NewBillPage } from "./pages/NewBillPage"; // <-- ADD THIS
import { BillHistoryPage } from "./pages/BillHistoryPage";
import { PrintBillPage } from "./pages/PrintBillPage";
import { ServicesPage } from "./pages/ServicesPage";
import { MedicineCategoriesPage } from "./pages/MedicineCategoriesPage";
import { VillagesPage } from "./pages/VillagesPage";
import { AgeCategoriesPage } from "./pages/AgeCategoriesPage";
import { MedicineInventoryPage } from "./pages/MedicineInventoryPage";
import { RacksPage } from "./pages/RacksPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { ReportsPage } from "./pages/ReportsPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/products" element={<ProductsPage />} /> {/* <-- ADD THIS */}
            <Route path="/new-bill" element={<NewBillPage />} />
            <Route path="/bill-history" element={<BillHistoryPage />} />
            <Route path="/bills/:id/print" element={<PrintBillPage />} />
            <Route path="/medicine-categories" element={<MedicineCategoriesPage />} />  
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/villages" element={<VillagesPage />} />
            <Route path="/age-categories" element={<AgeCategoriesPage />} />
            <Route path="/inventory" element={<MedicineInventoryPage />} />
            <Route path="/racks" element={<RacksPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
