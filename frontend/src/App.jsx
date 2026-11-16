import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./features/auth/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import PayrollPage from "./features/payroll/pages/PayrollPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/login" element={<Login />} />

        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                "SUPER ADMIN",
                "HR ADMIN",
                "HR EXECUTIVE",
                "ADMIN",
              ]}
            >
              <Dashboard role="Admin" />
            </ProtectedRoute>
          }
        />

        {/* Manager Dashboard */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["MANAGER", "MANAGER ROLE"]}
            >
              <Dashboard role="Manager" />
            </ProtectedRoute>
          }
        />

        {/* Employee Dashboard */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["EMPLOYEE", "EMPLOYEE ROLE"]}
            >
              <Dashboard role="Employee" />
            </ProtectedRoute>
          }
        />

        {/* Payroll */}
        <Route
          path="/payroll"
          element={
            <ProtectedRoute
              allowedRoles={[
                "SUPER ADMIN",
                "HR ADMIN",
                "HR EXECUTIVE",
                "ADMIN",
              ]}
            >
              <PayrollPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payroll/:payrollId"
          element={
            <ProtectedRoute
              allowedRoles={[
                "SUPER ADMIN",
                "HR ADMIN",
                "HR EXECUTIVE",
                "ADMIN",
              ]}
            >
              <PayrollPage />
            </ProtectedRoute>
          }
        />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
