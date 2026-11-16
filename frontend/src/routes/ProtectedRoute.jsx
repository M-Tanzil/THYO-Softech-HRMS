import { Navigate } from "react-router-dom";
import { getAccessToken } from "../services/storage/authStorage";

const normalizeRole = (role) =>
  String(role).trim().toUpperCase().replace(/[_-]/g, " ");

const getUserRoles = (token) => {
  try {
    const payloadPart = token.split(".")[1];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return Array.isArray(payload.roles)
      ? payload.roles.map(normalizeRole)
      : [];
  } catch {
    return null;
  }
};

const getDashboardPath = (roles) => {
  if (roles.some((role) =>
    ["SUPER ADMIN", "HR ADMIN", "HR EXECUTIVE", "ADMIN"].includes(role)
  )) {
    return "/admin/dashboard";
  }

  if (roles.some((role) => role.includes("MANAGER"))) {
    return "/manager/dashboard";
  }

  if (roles.some((role) => role.includes("EMPLOYEE"))) {
    return "/employee/dashboard";
  }

  return "/login";
};

function ProtectedRoute({ allowedRoles, children }) {
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const roles = getUserRoles(token);

  if (!roles) {
    return <Navigate to="/login" replace />;
  }

  const isAuthorized = roles.some((role) =>
    allowedRoles.includes(role)
  );

  if (!isAuthorized) {
    return <Navigate to={getDashboardPath(roles)} replace />;
  }

  return children;
}

export default ProtectedRoute;
