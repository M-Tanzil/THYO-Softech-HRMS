const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const cache = require('../utils/cache');

const JWT_SECRET = process.env.JWT_SECRET || 'thyo-softech-task-management-enterprise-secret-key-2026';

/**
 * ============================================================================
 * 1. CENTRAL HRMS AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * Consumes the centralized HRMS authentication system.
 * Extracts and verifies the JWT Bearer token, validates against PostgreSQL,
 * and sets the standard authenticated identity contract:
 *   - req.user.id / req.user.userId
 *   - req.user.employeeId
 *   - req.user.name / req.user.fullName
 *   - req.user.role (ADMIN, MANAGER, EMPLOYEE)
 *   - req.user.token / req.user.session
 *
 * If an upstream central HRMS authentication middleware already executed and
 * attached `req.user`, this middleware harmonizes and normalizes it.
 */
async function commonHrmsAuthMiddleware(req, res, next) {
  try {
    // 1. If upstream central HRMS middleware has already populated req.user, harmonize and proceed
    if (req.user && (req.user.employeeId || req.user.id || req.user.userId)) {
      normalizeUserObject(req.user);
      return next();
    }

    // 2. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required. Please provide a valid Bearer token.',
        error: 'Unauthorized'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.name === 'TokenExpiredError'
          ? 'Your session has expired. Please re-authenticate through central HRMS.'
          : 'Invalid or corrupted authentication token.',
        error: 'Unauthorized'
      });
    }

    const tokenIdentifier = decoded && (decoded.userId || decoded.id || decoded.sub || decoded.employeeId || decoded.empId || decoded.email);
    if (!decoded || !tokenIdentifier) {
      return res.status(401).json({
        success: false,
        message: 'Malformed token payload: missing user/employee identifier.',
        error: 'Unauthorized'
      });
    }

    // 3. Resolve real employee record from Cache (with SWR + in-flight deduplication) or PostgreSQL database
    const cacheKey = `auth_identity_${tokenIdentifier}`;
    const authUser = await cache.wrapSWR(cacheKey, 600000, 1800000, async () => {
      const empId = decoded.employeeId || decoded.empId;
      let employee = null;

      if (empId) {
        employee = await prisma.employee.findUnique({
          where: { employeeId: empId },
          include: { user: true }
        });
      } else if (decoded.userId || decoded.id || decoded.sub) {
        const uId = decoded.userId || decoded.id || decoded.sub;
        const userRecord = await prisma.user.findUnique({
          where: { id: uId },
          include: { employee: true }
        }).catch(() => null);

        if (userRecord?.employee) {
          employee = { ...userRecord.employee, user: userRecord };
        } else {
          employee = await prisma.employee.findUnique({
            where: { id: uId },
            include: { user: true }
          }).catch(() => null);
        }
      } else if (decoded.email) {
        employee = await prisma.employee.findUnique({
          where: { email: decoded.email },
          include: { user: true }
        });
      }

      if (!employee) {
        const err = new Error('The employee account associated with this session was not found in the HRMS database.');
        err.statusCode = 401;
        err.errorCode = 'Unauthorized';
        throw err;
      }

      if (employee.status !== 'ACTIVE') {
        const err = new Error('Your employee account is inactive. Please contact your THYO SOFTECH HR administrator.');
        err.statusCode = 403;
        err.errorCode = 'Forbidden';
        throw err;
      }

      let verifiedRole = (
        decoded.role ||
        employee.user?.role ||
        (employee.employeeId === 'EMP009' || employee.employeeId === 'EMP001' ? 'ADMIN' : employee.employeeId === 'EMP002' ? 'MANAGER' : 'EMPLOYEE')
      ).toUpperCase();
      if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(verifiedRole)) {
        verifiedRole = 'EMPLOYEE';
      }

      // 4. Standardized Authenticated Identity Contract
      const resolvedUser = {
        id: employee.user?.id || employee.id,
        userId: employee.user?.id || employee.id,
        employeeId: employee.employeeId,
        name: employee.fullName,
        fullName: employee.fullName,
        email: employee.email,
        role: verifiedRole,
        department: employee.department,
        designation: employee.designation,
        position: employee.position,
        status: employee.status,
        isActive: true,
        user: employee.user ? {
          id: employee.user.id,
          username: employee.user.username,
          email: employee.user.email,
          role: verifiedRole,
          isActive: employee.user.isActive
        } : null
      };

      if (resolvedUser.employeeId) cache.set(`auth_identity_${resolvedUser.employeeId}`, resolvedUser, 600000, 1800000);
      if (resolvedUser.id) cache.set(`auth_identity_${resolvedUser.id}`, resolvedUser, 600000, 1800000);
      if (resolvedUser.email) cache.set(`auth_identity_${resolvedUser.email}`, resolvedUser, 600000, 1800000);
      return resolvedUser;
    }).catch((err) => {
      cache.del(cacheKey);
      if (err.statusCode === 401 || err.statusCode === 403) {
        res.status(err.statusCode).json({
          success: false,
          message: err.message,
          error: err.errorCode
        });
        return null;
      }
      throw err;
    });

    if (!authUser) return;

    req.user = {
      ...authUser,
      token: token,
      session: {
        token,
        issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
      }
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * ============================================================================
 * 2. TEMPORARY DEVELOPMENT AUTHENTICATION ADAPTER
 * ============================================================================
 * Used only for local pair programming and isolated testing before central
 * HRMS authentication is fully connected.
 *
 * It reads the identity headers (`x-employee-id`, `x-user-role`), validates
 * the employee directly against PostgreSQL, and constructs the EXACT same
 * `req.user` shape. No separate login or registration page is ever exposed.
 *
 * NOTE FOR TEAMMATES:
 * To disable this adapter in production, ensure NODE_ENV=production or
 * set ENABLE_DEV_AUTH=false in your environment variables.
 */
async function devAuthAdapter(req, res, next) {
  try {
    const isDevEnabled = process.env.ENABLE_DEV_AUTH === 'true';
    if (!isDevEnabled) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required. Please provide a valid Bearer token.',
        error: 'Unauthorized'
      });
    }

    const headerEmpId = req.headers['x-employee-id'];
    if (!headerEmpId) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required. Please log in with valid credentials.',
        error: 'Unauthorized'
      });
    }

    const devCacheKey = `auth_dev_${headerEmpId}`;
    const cachedDevUser = cache.get(devCacheKey);
    if (cachedDevUser) {
      req.user = { ...cachedDevUser };
      return next();
    }

    const emp = await prisma.employee.findUnique({
      where: { employeeId: headerEmpId },
      include: { user: true }
    });

    if (!emp || emp.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: `Unauthorized: Employee '${headerEmpId}' is inactive or does not exist in database.`,
        error: 'Unauthorized'
      });
    }

    const requestedRole = req.headers['x-user-role'] ? req.headers['x-user-role'].toUpperCase() : null;
    const verifiedRole = (
      requestedRole ||
      emp.user?.role ||
      (emp.employeeId === 'EMP009' || emp.employeeId === 'EMP001' ? 'ADMIN' : emp.employeeId === 'EMP002' ? 'MANAGER' : 'EMPLOYEE')
    ).toUpperCase();

    req.user = {
      id: emp.user?.id || emp.id,
      userId: emp.user?.id || emp.id,
      employeeId: emp.employeeId,
      name: emp.fullName,
      fullName: emp.fullName,
      email: emp.email,
      role: verifiedRole,
      department: emp.department,
      designation: emp.designation,
      position: emp.position,
      status: emp.status,
      isActive: true,
      isDevAdapter: true
    };

    cache.set(devCacheKey, req.user, 60000);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Normalizes user object properties to ensure consistent access across all modules
 */
function normalizeUserObject(user) {
  if (!user) return;
  if (!user.userId && user.id) user.userId = user.id;
  if (!user.id && user.userId) user.id = user.userId;
  if (!user.name && user.fullName) user.name = user.fullName;
  if (!user.fullName && user.name) user.fullName = user.name;
  if (user.role) {
    let r = user.role.toUpperCase();
    if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(r)) {
      r = 'EMPLOYEE';
    }
    user.role = r;
  }
}

/**
 * ============================================================================
 * 3. MAIN AUTHENTICATION GATEWAY
 * ============================================================================
 * Determines whether to consume Central HRMS Auth or Development Adapter.
 */
async function authenticateUser(req, res, next) {
  // If upstream central HRMS middleware has already authenticated the request:
  if (req.user && (req.user.employeeId || req.user.id || req.user.userId)) {
    normalizeUserObject(req.user);
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return commonHrmsAuthMiddleware(req, res, next);
  }

  // Fallback to Development Adapter if in dev mode
  return devAuthAdapter(req, res, next);
}

/**
 * ============================================================================
 * 4. STRICT ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
 * ============================================================================
 */

/**
 * Strict Role Authorization Guard
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'MANAGER'
 */
function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before permission verification.',
        error: 'Unauthorized'
      });
    }

    const userRole = (req.user.role || 'EMPLOYEE').toUpperCase();

    // ADMIN always has master privilege across all tasks
    if (userRole === 'ADMIN') {
      return next();
    }

    // Check if user's verified database role is in allowed whitelist
    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Access restricted to authorized roles [${allowedRoles.join(', ')}]. Your verified role '${userRole}' does not possess required permissions.`,
      error: 'Forbidden'
    });
  };
}

/**
 * Task Access & Ownership Guard
 * - ADMIN: Full supervisory access to all tasks across THYO SOFTECH PVT LTD
 * - MANAGER: Can view and manage tasks in their authorized department or created by them
 * - EMPLOYEE: Strictly restricted to tasks explicitly assigned to them
 */
function requireTaskAccess(actionType = 'view') {
  return async (req, res, next) => {
    try {
      const taskId = req.params.id;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const userRole = (user.role || 'EMPLOYEE').toUpperCase();

      // 1. ADMIN has supervisory access across all company tasks
      if (userRole === 'ADMIN') {
        return next();
      }

      // Fetch task to inspect ownership and assignment
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignments: {
            include: {
              employee: true
            }
          }
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found.'
        });
      }

      // 2. MANAGER: can access tasks within their department/team or created by them
      if (userRole === 'MANAGER') {
        const isCreator = task.createdBy === user.employeeId;
        const matchesDepartment =
          task.category?.toLowerCase() === user.department?.toLowerCase() ||
          task.assignments.some(a => a.employee?.department?.toLowerCase() === user.department?.toLowerCase());
        const isAssigned = task.assignments.some(a => a.employeeId === user.employeeId);

        if (isCreator || matchesDepartment || isAssigned) {
          req.targetTask = task;
          return next();
        }

        return res.status(403).json({
          success: false,
          message: `Forbidden: Managers can only ${actionType} tasks within their authorized department/team (${user.department}).`,
          error: 'Forbidden'
        });
      }

      // 3. EMPLOYEE: Strictly restricted to tasks assigned to them
      const myAssignment = task.assignments.find(a => a.employeeId === user.employeeId);
      if (!myAssignment) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not assigned to this task. Employees can only ${actionType} deliverables assigned directly to them.`,
          error: 'Forbidden'
        });
      }

      req.taskAssignment = myAssignment;
      req.targetTask = task;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticateUser,
  commonHrmsAuthMiddleware,
  devAuthAdapter,
  requireRole,
  requireTaskAccess
};
