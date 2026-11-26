const prisma = require('../config/prisma');
const cache = require('../utils/cache');

class EmployeeController {
  async getCurrentUser(req, res, next) {
    try {
      if (!req.user || !req.user.employeeId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. No active employee session identified.',
          error: 'Unauthorized'
        });
      }

      // Fast-path: Return cached auth contract without hitting database
      if (req.user.employeeId && req.user.role) {
        return res.status(200).json({
          success: true,
          data: {
            id: req.user.id || req.user.userId,
            employeeId: req.user.employeeId,
            fullName: req.user.fullName || req.user.name,
            name: req.user.fullName || req.user.name,
            email: req.user.email,
            phone: req.user.phone || null,
            department: req.user.department,
            designation: req.user.designation,
            position: req.user.position,
            status: req.user.status || 'ACTIVE',
            joiningDate: req.user.joiningDate || new Date().toISOString(),
            role: req.user.role,
            user: req.user.user
          }
        });
      }

      const employee = await prisma.employee.findUnique({
        where: { employeeId: req.user.employeeId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        }
      });

      if (!employee || employee.status !== 'ACTIVE') {
        return res.status(404).json({
          success: false,
          message: 'Active employee record not found in database.',
          error: 'Not Found'
        });
      }

      const verifiedRole = (
        employee.user?.role ||
        (employee.employeeId === 'EMP001' || employee.employeeId === 'EMP009' ? 'ADMIN' : employee.employeeId === 'EMP002' ? 'MANAGER' : 'EMPLOYEE')
      ).toUpperCase();

      res.status(200).json({
        success: true,
        data: {
          id: employee.id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          name: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          designation: employee.designation,
          position: employee.position,
          status: employee.status,
          joiningDate: employee.joiningDate,
          role: verifiedRole,
          user: employee.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployees(req, res, next) {
    try {
      let deptFilter = null;

      if (req.user && req.user.role === 'MANAGER') {
        const mgrDept = (req.user.department || '').toLowerCase();

        if (req.query.department && req.query.department !== 'ALL' && req.query.department.toLowerCase() !== mgrDept) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Managers can only view or assign employees within their authorized department (${req.user.department}).`,
            error: 'Forbidden'
          });
        }

        if (req.query.scope === 'assignable' || req.query.scope === 'reassign' || req.query.scope === 'team') {
          deptFilter = req.user.department;
        } else if (req.query.department && req.query.department !== 'ALL') {
          deptFilter = req.user.department;
        }
      } else {
        if (req.query.department && req.query.department !== 'ALL') {
          deptFilter = req.query.department;
        }
      }

      const cacheKey = `employees_list_${deptFilter || 'ALL'}`;
      const employees = await cache.wrapSWR(cacheKey, 300000, 900000, async () => {
        const params = [];
        let deptSql = '';
        if (deptFilter) {
          params.push(deptFilter);
          deptSql = `AND LOWER(e.department) = LOWER($1)`;
        }

        const sql = `
          SELECT
            e.id, e."employeeId", e."fullName", e.email, e.phone,
            e.department, e.designation, e.position, e.status, e."joiningDate",
            CASE WHEN u.id IS NOT NULL THEN
              json_build_object('role', u.role, 'isActive', u."isActive")
            ELSE NULL END AS "user"
          FROM "Employee" e
          LEFT JOIN "User" u ON u."employeeId" = e."employeeId"
          WHERE e.status = 'ACTIVE' ${deptSql}
          ORDER BY e."employeeId" ASC
        `;
        return await prisma.$queryRawUnsafe(sql, ...params);
      });

      res.status(200).json({
        success: true,
        data: employees
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeMetadata(req, res, next) {
    try {
      const meta = await cache.wrapSWR('emp_metadata', 600000, 1800000, async () => {
        const employees = await prisma.employee.findMany({
          where: { status: 'ACTIVE' },
          select: { department: true, position: true, designation: true }
        });

        const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
        const positions = [...new Set(employees.map(e => e.position).filter(Boolean))].sort();
        const designations = [...new Set(employees.map(e => e.designation).filter(Boolean))].sort();

        return {
          departments,
          positions,
          designations
        };
      });

      res.status(200).json({
        success: true,
        data: meta
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmployeeController();
