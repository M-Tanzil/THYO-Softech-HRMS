const prisma = require('../config/prisma');

class ReportService {
  async getTaskAnalytics(filters = {}) {
    const { department, position, startDate, endDate } = filters;

    const taskWhere = {};
    if (startDate || endDate) {
      taskWhere.createdAt = {};
      if (startDate) taskWhere.createdAt.gte = new Date(startDate);
      if (endDate) taskWhere.createdAt.lte = new Date(endDate);
    }

    const allTasks = await prisma.task.findMany({
      where: taskWhere,
      select: { id: true, status: true, priority: true, category: true, deadline: true }
    });

    const total = allTasks.length;
    const pending = allTasks.filter(t => t.status === 'PENDING').length;
    const inProgress = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const onHold = allTasks.filter(t => t.status === 'ON_HOLD').length;
    const completed = allTasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = allTasks.filter(t => t.status === 'OVERDUE').length;
    const cancelled = allTasks.filter(t => t.status === 'CANCELLED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const priorityBreakdown = {
      LOW: allTasks.filter(t => t.priority === 'LOW').length,
      MEDIUM: allTasks.filter(t => t.priority === 'MEDIUM').length,
      HIGH: allTasks.filter(t => t.priority === 'HIGH').length,
      URGENT: allTasks.filter(t => t.priority === 'URGENT').length
    };

    const employeeWhere = { status: 'ACTIVE' };
    if (department && department !== 'ALL') employeeWhere.department = { equals: department, mode: 'insensitive' };
    if (position && position !== 'ALL') employeeWhere.position = { equals: position, mode: 'insensitive' };

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        assignments: {
          include: {
            task: {
              select: { id: true, title: true, status: true, priority: true, deadline: true }
            }
          }
        }
      }
    });

    const employeeMetrics = employees.map(emp => {
      const assignments = emp.assignments;
      const empTotal = assignments.length;
      const empCompleted = assignments.filter(a => a.status === 'COMPLETED').length;
      const empPending = assignments.filter(a => a.status === 'PENDING').length;
      const empInProgress = assignments.filter(a => a.status === 'IN_PROGRESS').length;
      const empOnHold = assignments.filter(a => a.status === 'ON_HOLD').length;
      const empOverdue = assignments.filter(a => a.status === 'OVERDUE').length;
      const empRate = empTotal > 0 ? Math.round((empCompleted / empTotal) * 100) : 0;

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        position: emp.position,
        totalAssigned: empTotal,
        completed: empCompleted,
        pending: empPending,
        inProgress: empInProgress,
        onHold: empOnHold,
        overdue: empOverdue,
        completionRate: empRate
      };
    });

    const departmentMap = {};
    for (const row of employeeMetrics) {
      if (!departmentMap[row.department]) {
        departmentMap[row.department] = {
          department: row.department,
          employeesCount: 0,
          totalAssigned: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          overdue: 0
        };
      }
      departmentMap[row.department].employeesCount += 1;
      departmentMap[row.department].totalAssigned += row.totalAssigned;
      departmentMap[row.department].completed += row.completed;
      departmentMap[row.department].pending += row.pending;
      departmentMap[row.department].inProgress += row.inProgress;
      departmentMap[row.department].overdue += row.overdue;
    }

    const departmentMetrics = Object.values(departmentMap).map(d => ({
      ...d,
      completionRate: d.totalAssigned > 0 ? Math.round((d.completed / d.totalAssigned) * 100) : 0
    }));

    return {
      summary: {
        total,
        pending,
        inProgress,
        onHold,
        completed,
        overdue,
        cancelled,
        completionRate
      },
      priorityBreakdown,
      employeeMetrics,
      departmentMetrics
    };
  }

  async generateCsvExport(filters = {}) {
    const analytics = await this.getTaskAnalytics(filters);

    let csv = 'THYO SOFTECH PVT LTD - HRMS TASK MANAGEMENT REPORT\n';
    csv += `Generated At: ${new Date().toISOString()}\n\n`;

    csv += 'SUMMARY METRICS\n';
    csv += 'Total Tasks,Completed,Pending,In Progress,On Hold,Overdue,Cancelled,Completion Rate\n';
    const s = analytics.summary;
    csv += `${s.total},${s.completed},${s.pending},${s.inProgress},${s.onHold},${s.overdue},${s.cancelled},${s.completionRate}%\n\n`;

    csv += 'EMPLOYEE PERFORMANCE BREAKDOWN\n';
    csv += 'Employee ID,Full Name,Department,Designation,Total Assigned,Completed,Pending,In Progress,On Hold,Overdue,Completion Rate\n';
    for (const e of analytics.employeeMetrics) {
      csv += `"${e.employeeId}","${e.fullName}","${e.department}","${e.designation}",${e.totalAssigned},${e.completed},${e.pending},${e.inProgress},${e.onHold},${e.overdue},${e.completionRate}%\n`;
    }

    csv += '\nDEPARTMENT PERFORMANCE BREAKDOWN\n';
    csv += 'Department,Employees,Total Assigned,Completed,Pending,In Progress,Overdue,Completion Rate\n';
    for (const d of analytics.departmentMetrics) {
      csv += `"${d.department}",${d.employeesCount},${d.totalAssigned},${d.completed},${d.pending},${d.inProgress},${d.overdue},${d.completionRate}%\n`;
    }

    return csv;
  }
}

module.exports = new ReportService();
