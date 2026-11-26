const wfhRepository = require('../repositories/wfhRepository');
const notificationService = require('./notificationService');
const prisma = require('../config/prisma');
const {
  normalizeCalendarDate,
  calculateCalendarDays,
  formatCalendarDate
} = require('../utils/dateUtils');

class WfhService {
  async createRequest(data, user) {
    if (!data.startDate || !data.endDate) {
      const error = new Error('Start date and end date are required.');
      error.statusCode = 400;
      throw error;
    }

    const normStart = normalizeCalendarDate(data.startDate);
    const normEnd = normalizeCalendarDate(data.endDate);

    if (normStart.date.getTime() > normEnd.date.getTime()) {
      const error = new Error('Start date cannot be after end date.');
      error.statusCode = 400;
      throw error;
    }

    const calculatedDays = calculateCalendarDays(normStart.date, normEnd.date);
    let days = data.days !== undefined ? Number(data.days) : (data.daysCount !== undefined ? Number(data.daysCount) : calculatedDays);
    if (!days || days < 0.5) {
      days = calculatedDays;
    }

    const employeeId = data.employeeId || user.employeeId;
    let employeeName = data.employeeName || user.fullName || user.name;
    let employeeRole = data.employeeRole || user.designation || user.role;
    let department = data.department || user.department;

    // Run overlap check & optional employee lookup concurrently
    const [overlapping, emp] = await Promise.all([
      prisma.wfhRequest.findFirst({
        where: {
          employeeId,
          status: { in: ['Pending', 'Approved', 'PENDING', 'APPROVED'] },
          startDate: { lte: normEnd.date },
          endDate: { gte: normStart.date }
        },
        select: { status: true }
      }),
      (!employeeName || !department)
        ? prisma.employee.findUnique({ where: { employeeId } })
        : Promise.resolve(null)
    ]);

    if (emp) {
      employeeName = emp.fullName;
      employeeRole = emp.designation;
      department = emp.department;
    }

    if (overlapping) {
      const error = new Error(
        `You already have an active WFH request (${overlapping.status}) overlapping with the selected dates.`
      );
      error.statusCode = 400;
      throw error;
    }

    const request = await wfhRepository.createRequest({
      id: data.id || undefined,
      employeeId,
      employeeName,
      employeeRole,
      department,
      startDate: normStart.date,
      endDate: normEnd.date,
      days,
      daysCount: days,
      reason: data.reason,
      remarks: data.remarks || null,
      contactNumber: data.contactNumber || null,
      equipmentConfirmed: data.equipmentConfirmed !== undefined ? Boolean(data.equipmentConfirmed) : true,
      vpnSecured: data.vpnSecured !== undefined ? Boolean(data.vpnSecured) : true,
      tasksPlanned: data.tasksPlanned || null,
      status: 'Pending',
      appliedDate: new Date(),
      approvedBy: 'Pending Review'
    });

    // Notify in background so HTTP response is immediate
    setImmediate(() => {
      const startDisplay = formatCalendarDate(normStart.date, 'DD-MM-YYYY');
      const endDisplay = formatCalendarDate(normEnd.date, 'DD-MM-YYYY');
      notificationService.notifyWfh({
        recipientId: 'EMP009',
        title: 'New WFH Request Submitted',
        message: `${employeeName} requested WFH for ${startDisplay} to ${endDisplay} (${days} days).`,
        requestId: request.id,
        type: 'wfh'
      }).catch(() => {});
    });

    return request;
  }

  async getRequests(user, filters = {}) {
    const role = (user.role || 'EMPLOYEE').toUpperCase();
    const query = { ...filters };
    if (role === 'EMPLOYEE') {
      query.employeeId = user.employeeId;
    } else if (role === 'MANAGER') {
      if (user.department) query.department = user.department;
    }
    return await wfhRepository.getRequests(query);
  }

  async getMyRequests(user, filters = {}) {
    return await wfhRepository.getRequests({
      ...filters,
      employeeId: user.employeeId
    });
  }

  async getRequestById(id, user) {
    const request = await wfhRepository.getRequestById(id);
    if (!request) {
      const error = new Error('WFH request not found');
      error.statusCode = 404;
      throw error;
    }
    const role = (user.role || 'EMPLOYEE').toUpperCase();
    if (role === 'EMPLOYEE' && request.employeeId !== user.employeeId) {
      const error = new Error('Forbidden: You can only view your own WFH requests.');
      error.statusCode = 403;
      throw error;
    }
    if (role === 'MANAGER' && request.employeeId !== user.employeeId) {
      if (request.department && user.department && request.department.toLowerCase() !== user.department.toLowerCase()) {
        const error = new Error(`Forbidden: Managers can only view WFH requests from their department (${user.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }
    return request;
  }

  async reviewRequest(id, { status, rejectionReason, approverNote }, user) {
    const request = await wfhRepository.getRequestById(id);
    if (!request) {
      const error = new Error('WFH request not found.');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'MANAGER') {
      if (request.department && user.department && request.department.toLowerCase() !== user.department.toLowerCase()) {
        const error = new Error(`Forbidden: Managers can only review WFH requests from their department (${user.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }

    const isRejected = status.toUpperCase() === 'REJECTED';
    if (isRejected && (!rejectionReason || !rejectionReason.trim())) {
      const error = new Error('Rejection reason is mandatory for WFH audit trail.');
      error.statusCode = 400;
      throw error;
    }

    const approverName = user.fullName || user.name || 'Manager';
    const updated = await wfhRepository.updateStatus(id, {
      status,
      approverId: user.employeeId,
      approverName,
      approverNote: approverNote || (status.toUpperCase() === 'APPROVED' ? 'Approved by manager' : undefined),
      rejectionReason: rejectionReason || null
    });

    // Notify employee asynchronously
    setImmediate(() => {
      const dateDisplay = formatCalendarDate(request.startDate, 'DD-MM-YYYY');
      notificationService.notifyWfh({
        recipientId: request.employeeId,
        title: `WFH Request ${status.toUpperCase() === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Your WFH request for ${dateDisplay} has been ${status.toLowerCase()} by ${approverName}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        requestId: id,
        type: status.toUpperCase() === 'APPROVED' ? 'SUCCESS' : 'WARNING'
      }).catch(() => {});
    });

    return updated;
  }

  async cancelRequest(id, user) {
    const request = await wfhRepository.getRequestById(id);
    if (!request) {
      const error = new Error('WFH request not found');
      error.statusCode = 404;
      throw error;
    }
    if (request.employeeId !== user.employeeId) {
      const error = new Error('You can only cancel your own WFH requests.');
      error.statusCode = 403;
      throw error;
    }
    if (request.status.toUpperCase() !== 'PENDING') {
      const error = new Error(`Cannot cancel a WFH request that is already ${request.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    await wfhRepository.cancelRequest(id, user.employeeId);
    return { success: true, message: 'WFH request cancelled successfully.' };
  }

  async getStats(user, department = null) {
    return await wfhRepository.getStats(null, department);
  }
}

module.exports = new WfhService();
