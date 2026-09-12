const prisma = require('../config/prisma');

class EmployeeController {
  async getEmployees(req, res, next) {
    try {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { employeeId: 'asc' },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          phone: true,
          department: true,
          designation: true,
          position: true,
          status: true,
          joiningDate: true
        }
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
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { department: true, position: true, designation: true }
      });

      const departments = [...new Set(employees.map(e => e.department))].sort();
      const positions = [...new Set(employees.map(e => e.position))].sort();
      const designations = [...new Set(employees.map(e => e.designation))].sort();

      res.status(200).json({
        success: true,
        data: {
          departments,
          positions,
          designations
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmployeeController();
