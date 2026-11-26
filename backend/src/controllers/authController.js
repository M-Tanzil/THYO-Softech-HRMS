const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const cache = require('../utils/cache');

const JWT_SECRET = process.env.JWT_SECRET || 'thyo-softech-task-management-enterprise-secret-key-2026';

class AuthController {
  /**
   * Real Database Authentication: Verify credentials, hash compare with bcrypt, issue JWT
   */
  async login(req, res, next) {
    try {
      const { username, email, identifier, password } = req.body;
      const loginId = (identifier || username || email || '').trim();

      if (!loginId || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both username/email and password.',
          error: 'Bad Request'
        });
      }

      // Fast-path index query: exact match or lower-case match first
      const lowerLoginId = loginId.toLowerCase();
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: loginId },
            { username: lowerLoginId },
            { email: loginId },
            { email: lowerLoginId },
            { employeeId: loginId }
          ]
        },
        include: {
          employee: true
        }
      });

      // Fallback if needed for insensitive employee relations
      if (!user) {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: loginId, mode: 'insensitive' } },
              { email: { equals: loginId, mode: 'insensitive' } },
              { employeeId: { equals: loginId, mode: 'insensitive' } },
              { employee: { employeeId: { equals: loginId, mode: 'insensitive' } } }
            ]
          },
          include: {
            employee: true
          }
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username/email or password.',
          error: 'Unauthorized'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated. Please contact your THYO SOFTECH HR administrator.',
          error: 'Forbidden'
        });
      }

      // Compare password with bcrypt hash
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username/email or password.',
          error: 'Unauthorized'
        });
      }

      // Check linked employee active status
      if (user.employee && user.employee.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Your employee record is inactive. Please contact HR.',
          error: 'Forbidden'
        });
      }

      let rawRole = (user.role || 'EMPLOYEE').toUpperCase();
      if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(rawRole)) {
        rawRole = 'EMPLOYEE';
      }
      const verifiedRole = rawRole;
      const department = user.employee?.department || null;
      const employeeId = user.employeeId || null;
      const fullName = user.employee?.fullName || user.username;

      // Generate signed JWT Bearer token
      const token = jwt.sign(
        {
          userId: user.id,
          id: user.id,
          username: user.username,
          email: user.email,
          role: verifiedRole,
          employeeId,
          department
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Record Audit Log in PostgreSQL (non-blocking for fast login response)
      prisma.auditLog.create({
        data: {
          userId: user.id,
          employeeId,
          action: 'USER_LOGIN',
          entityType: 'AUTH',
          entityId: user.id,
          details: `User ${user.username} [${verifiedRole}] logged in successfully.`
        }
      }).catch(auditErr => {
        console.warn('Audit log creation failed on login:', auditErr.message);
      });

      // Safe user payload (NEVER return passwordHash)
      const safeUser = {
        id: user.id,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: verifiedRole,
        employeeId,
        fullName,
        name: fullName,
        department,
        designation: user.employee?.designation || null,
        position: user.employee?.position || null,
        status: user.employee?.status || (user.isActive ? 'ACTIVE' : 'INACTIVE')
      };

      // Pre-warm authentication cache for immediate sub-millisecond responses
      const cachedIdentity = {
        id: user.id,
        userId: user.id,
        employeeId,
        name: fullName,
        fullName,
        email: user.email,
        role: verifiedRole,
        department,
        designation: user.employee?.designation || null,
        position: user.employee?.position || null,
        status: safeUser.status,
        isActive: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: verifiedRole,
          isActive: user.isActive
        }
      };

      if (user.id) cache.set(`auth_identity_${user.id}`, cachedIdentity, 600000, 1800000);
      if (employeeId) cache.set(`auth_identity_${employeeId}`, cachedIdentity, 600000, 1800000);
      if (user.username) cache.set(`auth_identity_${user.username}`, cachedIdentity, 600000, 1800000);
      if (user.email) cache.set(`auth_identity_${user.email}`, cachedIdentity, 600000, 1800000);

      // Non-blocking per-user background cache warmup so first module clicks are instant
      if (employeeId) {
        setImmediate(() => {
          try {
            const leaveService = require('../services/leaveService');
            const wfhService = require('../services/wfhService');
            const performanceService = require('../services/performanceService');
            const notificationRepository = require('../repositories/notificationRepository');
            const ctxUser = { employeeId, role: verifiedRole, department };
            const tasks = [
              leaveService.getLeaveBalances(employeeId, new Date().getFullYear()),
              leaveService.getMyRequests(ctxUser, {}),
              wfhService.getMyRequests(ctxUser, {}),
              notificationRepository.getNotifications(employeeId, { limit: 50, offset: 0 }),
              notificationRepository.getPreferences(employeeId)
            ];
            if (verifiedRole !== 'ADMIN') {
              tasks.push(leaveService.getStats(ctxUser));
              tasks.push(performanceService.getGoals(ctxUser, {}));
            }
            if (verifiedRole === 'MANAGER') {
              tasks.push(leaveService.getLeaveRequests(ctxUser, {}));
              tasks.push(wfhService.getRequests(ctxUser, {}));
            }
            Promise.allSettled(tasks).catch(() => {});
          } catch {
            // Ignore background warmup failures
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: safeUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Return verified identity of authenticated user from database
   */
  async me(req, res, next) {
    try {
      if (!req.user || (!req.user.id && !req.user.employeeId)) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. No active session found.',
          error: 'Unauthorized'
        });
      }

      // Fast-path: Return pre-validated identity from authMiddleware without redundant DB query
      if (req.user.email && req.user.role && (req.user.employeeId || req.user.id)) {
        const safeUser = {
          id: req.user.id || req.user.userId,
          userId: req.user.userId || req.user.id,
          username: req.user.user?.username || req.user.username || req.user.email.split('@')[0],
          email: req.user.email,
          role: req.user.role,
          employeeId: req.user.employeeId,
          fullName: req.user.fullName || req.user.name,
          name: req.user.fullName || req.user.name,
          department: req.user.department || null,
          designation: req.user.designation || null,
          position: req.user.position || null,
          status: req.user.status || 'ACTIVE'
        };

        return res.status(200).json({
          success: true,
          user: safeUser
        });
      }

      let user = null;
      if (req.user.id || req.user.userId) {
        user = await prisma.user.findUnique({
          where: { id: req.user.id || req.user.userId },
          include: { employee: true }
        });
      } else if (req.user.employeeId) {
        const emp = await prisma.employee.findUnique({
          where: { employeeId: req.user.employeeId },
          include: { user: true }
        });
        if (emp?.user) {
          user = { ...emp.user, employee: emp };
        }
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Authenticated user account not found in database.',
          error: 'Not Found'
        });
      }

      let rawRole = (user.role || 'EMPLOYEE').toUpperCase();
      if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(rawRole)) {
        rawRole = 'EMPLOYEE';
      }
      const verifiedRole = rawRole;
      const safeUser = {
        id: user.id,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: verifiedRole,
        employeeId: user.employeeId,
        fullName: user.employee?.fullName || user.username,
        name: user.employee?.fullName || user.username,
        department: user.employee?.department || null,
        designation: user.employee?.designation || null,
        position: user.employee?.position || null,
        status: user.employee?.status || (user.isActive ? 'ACTIVE' : 'INACTIVE')
      };

      res.status(200).json({
        success: true,
        user: safeUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout endpoint (creates audit log)
   */
  async logout(req, res, next) {
    try {
      if (req.user) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user.id || req.user.userId,
              employeeId: req.user.employeeId || null,
              action: 'USER_LOGOUT',
              entityType: 'AUTH',
              entityId: req.user.id || req.user.userId,
              details: `User ${req.user.fullName || req.user.username} [${req.user.role}] logged out.`
            }
          });
        } catch (e) {
          // non-blocking
        }
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Development Only: Generate authentic JWT session for testing roles without passwords
   */
  async devSession(req, res, next) {
    try {
      const { role, employeeId } = req.body;
      const targetRole = (role || 'ADMIN').toUpperCase();

      let empId = employeeId;
      if (!empId) {
        if (targetRole === 'ADMIN') empId = 'EMP001';
        else if (targetRole === 'MANAGER') empId = 'EMP002';
        else empId = 'EMP003'; // EMPLOYEE
      }

      const emp = await prisma.employee.findUnique({
        where: { employeeId: empId },
        include: { user: true }
      });

      if (!emp || emp.status !== 'ACTIVE') {
        return res.status(404).json({
          success: false,
          message: `Employee '${empId}' not found or is inactive.`
        });
      }

      const verifiedRole = (emp.user?.role || targetRole).toUpperCase();
      const token = jwt.sign(
        {
          userId: emp.user?.id || emp.id,
          id: emp.user?.id || emp.id,
          username: emp.user?.username || emp.employeeId,
          email: emp.email,
          role: verifiedRole,
          employeeId: emp.employeeId,
          department: emp.department
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const safeUser = {
        id: emp.user?.id || emp.id,
        userId: emp.user?.id || emp.id,
        username: emp.user?.username || emp.employeeId,
        email: emp.email,
        role: verifiedRole,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        name: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        position: emp.position,
        status: emp.status
      };

      res.status(200).json({
        success: true,
        message: `Development session established for ${emp.fullName} [${verifiedRole}].`,
        token,
        user: safeUser
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
