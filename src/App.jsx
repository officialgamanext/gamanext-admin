import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Employees from "./pages/Employees/Employees";
import EmployeeDetails from "./pages/EmployeeDetails/EmployeeDetails";
import Leaves from "./pages/Leaves/Leaves";
import Timesheet from "./pages/Timesheet/Timesheet";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:empId" element={<EmployeeDetails />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="timesheet" element={<Timesheet />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
