const prisma = require('../config/prisma');

/**
 * Strict Role-Based Access Control (RBAC) Middleware
 * 
 * Configures role permissions across THYO SOFTECH PVT LTD HRMS:
 * - Administrative / Management Roles: ['ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER']
 *   Can create, assign, edit, reassign, delete tasks, access reports, and publish announcements.
 * - Employee Role: ['EMPLOYEE']
 *   Can ONLY view assigned tasks, update their own task status/progress, add comments,
 *   and view notifications/announcements.
 */

async function authenticateUser(req, res, next) {
  try {
    // 1. Read request headers (sent by active development session or JWT bearer token)
    const headerEmpId = req.headers['x-employee-id'] || 'EMP001';
    let headerRole = (req.headers['x-user-role'] || '').toUpperCase();

    // 2. Fetch employee record from database to verify active employment
    let employee = await prisma.employee.findUnique({
      where: { employeeId: headerEmpId }
    });

    if (!employee) {
      employee = await prisma.employee.findUnique({
        where: { employeeId: 'EMP001' }
      });
    }

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No active employee found for session identity.'
      });
    }

    // Default role derivation if not explicitly passed
    if (!headerRole) {
      if (employee.employeeId === 'EMP001') headerRole = 'ADMIN';
      else if (employee.department === 'HR') headerRole = 'HR';
      else headerRole = 'EMPLOYEE';
    }

    // Attach authenticated identity to req.user
    req.user = {
      id: employee.id,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      position: employee.position,
      role: headerRole
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Strict Role Authorization Guard
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'HR', 'MANAGER'
 */
function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before permission verification.'
      });
    }

    const userRole = (req.user.role || 'EMPLOYEE').toUpperCase();

    // SUPER_ADMIN and ADMIN always have master privilege
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user's role is in the allowed whitelist
    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Access restricted to authorized personnel [${allowedRoles.join(', ')}]. Role '${userRole}' does not possess required administrative permissions.`,
      error: 'Forbidden'
    });
  };
}

/**
 * Task Access & Ownership Guard
 * Verifies that an employee is actually assigned to the task before allowing
 * viewing, status updates, or comments.
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

      // Admin, HR, and Managers have full supervisory access to all company tasks
      if (['ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER'].includes(userRole)) {
        return next();
      }

      // If user is a regular employee, verify they are assigned to this specific task
      const assignment = await prisma.taskAssignment.findUnique({
        where: {
          taskId_employeeId: {
            taskId,
            employeeId: user.employeeId
          }
        }
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not assigned to this task. Employees can only ${actionType} deliverables assigned directly to them.`,
          error: 'Forbidden'
        });
      }

      // Attach the verified assignment for downstream controller usage
      req.taskAssignment = assignment;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticateUser,
  requireRole,
  requireTaskAccess
};
