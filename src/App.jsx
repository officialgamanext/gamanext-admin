import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import EmployeePortalLayout from "./components/EmployeePortal/EmployeePortalSidebar"
import Dashboard from "./pages/Dashboard/Dashboard";
import Employees from "./pages/Employees/Employees";
import EmployeeDetails from "./pages/EmployeeDetails/EmployeeDetails";
import Leaves from "./pages/Leaves/Leaves";
import Timesheet from "./pages/Timesheet/Timesheet";
import OfferLetter from "./pages/OfferLetter/OfferLetter";
import EmployeeLeaves from "./pages/EmployeePortal/EmployeeLeaves";
import EmployeeTimesheet from "./pages/EmployeePortal/EmployeeTimesheet";
import Login from "./pages/Login/Login";
import Invoices from "./pages/Invoices/Invoices";
import Customers from "./pages/Customers/Customers";
import CustomerDetails from "./pages/CustomerDetails/CustomerDetails";
import Reports from "./pages/Reports/Reports";
import { Toaster } from 'react-hot-toast';
import "./index.css";
import "./components/EmployeePortal/EmployeePortal.css";

/* ── Full-screen loader while checking auth ── */
function SplashLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0f0c29,#24243e)',
      gap: 18,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
      }}>🚀</div>
      <div style={{
        width: 32, height: 32,
        border: '3px solid rgba(255,255,255,0.15)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* EmployeePortalLayout is imported directly from EmployeePortalSidebar.jsx */

/* ── Inner app — uses auth context ── */
function AppRoutes() {
  const { user, loading, isAdmin, isEmployee } = useAuth();

  if (loading) return <SplashLoader />;

  // Not logged in — show login
  if (!user) return <Login />;

  // ── Employee portal ──
  if (isEmployee) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EmployeePortalLayout />}>
            <Route index element={<Navigate to="/my/leaves" replace />} />
            <Route path="my/leaves"     element={<EmployeeLeaves />} />
            <Route path="my/timesheet"  element={<EmployeeTimesheet />} />
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/my/leaves" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  // ── Admin portal ──
  if (isAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"          element={<Dashboard />} />
            <Route path="employees"          element={<Employees />} />
            <Route path="employees/:empId"   element={<EmployeeDetails />} />
            <Route path="leaves"             element={<Leaves />} />
            <Route path="timesheet"          element={<Timesheet />} />
            <Route path="offer-letter"       element={<OfferLetter />} />
            <Route path="invoices"           element={<Invoices />} />
            <Route path="customers"          element={<Customers />} />
            <Route path="customers/:id"      element={<CustomerDetails />} />
            <Route path="reports"            element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  // Fallback
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <AppRoutes />
    </AuthProvider>
  );
}
