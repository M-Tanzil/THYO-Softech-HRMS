import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./features/auth/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import Dashboard from "./pages/Dashboard";

import AdminLayout from "./layouts/admin/AdminLayout";
import ManagerLayout from "./pages/manager/ManagerLayout";
import EmployeeLayout from "./pages/employee/EmployeeLayout";

import OvertimePage from "./features/overtime/pages/OvertimePage";

import PayrollPage from "./features/payroll/pages/PayrollPage.jsx";

const adminRoles = [
  "SUPER ADMIN",
  "HR ADMIN",
  "HR EXECUTIVE",
  "ADMIN",
];

const managerRoles = ["MANAGER", "MANAGER ROLE"];

const employeeRoles = ["EMPLOYEE", "EMPLOYEE ROLE"];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/login" element={<Login />} />

        {/* Admin Portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<Navigate to="/admin/dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<Dashboard role="Admin" />}
          />

          <Route
            path="overtime"
            element={<OvertimePage />}
          />
        </Route>

        {/* Manager Portal */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<Navigate to="/manager/dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<Dashboard role="Manager" />}
          />

          <Route
            path="overtime"
            element={<OvertimePage />}
          />
        </Route>

        {/* Employee Portal */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRoles={employeeRoles}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<Navigate to="/employee/dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<Dashboard role="Employee" />}
          />

          <Route
            path="overtime"
            element={<OvertimePage />}
          />
        </Route>

        {/* Payroll - Existing routes preserved */}
        <Route
          path="/payroll"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payroll/:payrollId"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />

        {/* Default Routes */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;