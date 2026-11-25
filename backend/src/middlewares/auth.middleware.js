
import { verifyAccessToken } from "../utils/jwt.js";

const normalizeRole = (role) =>
  String(role).trim().toUpperCase().replace(/[_-]/g, " ");

/**
 * Verify the access token and attach authenticated user information.
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing",
      });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token payload",
      });
    }

    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      roles: Array.isArray(decoded.roles)
        ? decoded.roles.map(normalizeRole)
        : [],
    };

    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Access token has expired"
        : "Invalid access token";

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

/**
 * Allow access only to users with at least one permitted role.
 * Must be used after authenticate.
 */
export const authorizeRoles = (...allowedRoles) => {
  const permittedRoles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const hasPermission = req.user.roles.some((role) =>
      permittedRoles.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};
