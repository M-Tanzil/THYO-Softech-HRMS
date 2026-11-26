const leaveRepository = require('../repositories/leaveRepository');
const notificationService = require('./notificationService');
const prisma = require('../config/prisma');
const cache = require('../utils/cache');
const {
  normalizeCalendarDate,
  calculateCalendarDays,
  formatCalendarDate
} = require('../utils/dateUtils');

class LeaveService {
  async getLeaveTypes(status = 'ACTIVE') {
    return await leaveRepository.getLeaveTypes(status);
  }

  async createLeaveType(data) {
    const payload = {
      name: data.name,
      code: data.code,
      description: data.description || null,
      defaultDays: Number(data.defaultDays) || 0,
      isPaid: data.isPaid !== undefined ? Boolean(data.isPaid) : true,
      carryForward: data.carryForward !== undefined ? Boolean(data.carryForward) : false,
      maxCarryForward: data.maxCarryForward ? Number(data.maxCarryForward) : 0,
      requiresProof: data.requiresProof !== undefined ? Boolean(data.requiresProof) : false,
      status: data.status || 'ACTIVE'
    };
    cache.delPrefix('leave_types_');
    return await prisma.leaveType.create({ data: payload });
  }

  async updateLeaveType(id, data) {
    cache.delPrefix('leave_types_');
    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.code !== undefined) payload.code = data.code;
    if (data.description !== undefined) payload.description = data.description;
    if (data.defaultDays !== undefined) payload.defaultDays = Number(data.defaultDays);
    if (data.isPaid !== undefined) payload.isPaid = Boolean(data.isPaid);
    if (data.carryForward !== undefined) payload.carryForward = Boolean(data.carryForward);
    if (data.maxCarryForward !== undefined) payload.maxCarryForward = Number(data.maxCarryForward);
    if (data.requiresProof !== undefined) payload.requiresProof = Boolean(data.requiresProof);
    if (data.status !== undefined) payload.status = data.status;
    return await prisma.leaveType.update({ where: { id }, data: payload });
  }

  async deleteLeaveType(id) {
    cache.delPrefix('leave_types_');
    return await prisma.leaveType.delete({ where: { id } });
  }

  async getLeaveBalances(employeeId, year = 2026) {
    let balances = await leaveRepository.getLeaveBalances(employeeId, year);

    if (!balances || balances.length === 0) {
      const types = await leaveRepository.getLeaveTypes('ACTIVE');
      if (types.length > 0) {
        await prisma.leaveBalance.createMany({
          data: types.map(t => ({
            employeeId,
            leaveTypeId: t.id,
            year: Number(year),
            allocated: t.defaultDays,
            carriedForward: 0,
            total: t.defaultDays,
            used: 0,
            pending: 0,
            remaining: t.defaultDays
          })),
          skipDuplicates: true
        });
        cache.delPrefix('leave_balances_');
        balances = await leaveRepository.getLeaveBalances(employeeId, year);
      }
    }

    return balances;
  }

  async _resolveLeaveType(typeKey) {
    if (!typeKey) return null;
    const cachedTypes = await leaveRepository.getLeaveTypes(null);
    const upper = typeKey.toUpperCase();
    const codeMap = {
      CASUAL: 'CL', CL: 'CL', SICK: 'SL', SL: 'SL',
      PRIVILEGE: 'PL', EARNED: 'PL', PL: 'PL',
      MATERNITY: 'ML', ML: 'ML', PATERNITY: 'PAT', PAT: 'PAT',
      COMP: 'COMP', COMP_OFF: 'COMP', 'COMP-OFF': 'COMP',
      LWP: 'UNPAID', UNPAID: 'UNPAID'
    };
    const mappedCode = codeMap[upper] || upper;
    return (
      cachedTypes.find(t => t.id === typeKey) ||
      cachedTypes.find(t => t.code?.toUpperCase() === mappedCode) ||
      cachedTypes.find(t => t.name?.toLowerCase().includes(typeKey.toLowerCase())) ||
      null
    );
  }

  async createLeaveRequest(data, currentUser) {
    const employeeId = currentUser.employeeId;

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

    const year = normStart.year;
    const calendarDays = calculateCalendarDays(normStart.date, normEnd.date);
    let requestedDays = data.isHalfDay ? 0.5 : (data.daysCount !== undefined ? Number(data.daysCount) : calendarDays);
    if (!data.isHalfDay && calendarDays > 1 && (!data.daysCount || requestedDays === 1)) {
      requestedDays = calendarDays;
    }

    const typeKey = (data.leaveTypeId || data.leaveType || '').toString().trim();

    // Run overlap check & leave type resolution concurrently (leaveTypes is usually in-memory cached!)
    const [overlapping, leaveType] = await Promise.all([
      prisma.leaveRequest.findFirst({
        where: {
          employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
          startDate: { lte: normEnd.date },
          endDate: { gte: normStart.date }
        },
        select: { status: true, leaveType: { select: { name: true } } }
      }),
      this._resolveLeaveType(typeKey)
    ]);

    if (overlapping) {
      const error = new Error(
        `You already have an active leave request (${overlapping.status} - ${overlapping.leaveType?.name || 'Leave'}) overlapping with the selected dates.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (!leaveType) {
      const error = new Error('Invalid leave type specified');
      error.statusCode = 400;
      throw error;
    }
    const resolvedLeaveTypeId = leaveType.id;

    // Fetch or initialize Leave Balance
    let balance = await leaveRepository.getLeaveBalance(employeeId, resolvedLeaveTypeId, year);
    if (!balance && leaveType.code !== 'UNPAID') {
      balance = await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId: resolvedLeaveTypeId,
          year,
          allocated: leaveType.defaultDays,
          carriedForward: 0,
          total: leaveType.defaultDays,
          used: 0,
          pending: 0,
          remaining: leaveType.defaultDays
        },
        include: { leaveType: true }
      });
    }

    if (leaveType.code !== 'UNPAID' && balance) {
      const availableBalance = balance.remaining - balance.pending;
      if (requestedDays > availableBalance) {
        const error = new Error(
          `Insufficient ${leaveType.name} balance. Requested: ${requestedDays} day(s), Available: ${availableBalance} day(s).`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // Create Leave Request and update pending count concurrently
    const [request] = await Promise.all([
      leaveRepository.createLeaveRequest({
        ...data,
        leaveTypeId: resolvedLeaveTypeId,
        employeeId,
        startDate: normStart.date,
        endDate: normEnd.date,
        daysCount: requestedDays,
        status: 'PENDING'
      }),
      balance
        ? leaveRepository.updateLeaveBalance(balance.id, {
            pending: balance.pending + requestedDays
          })
        : Promise.resolve()
    ]);

    // Dispatch approver notifications in background so HTTP response is immediate
    setImmediate(async () => {
      try {
        const approvers = await prisma.employee.findMany({
          where: {
            OR: [
              { department: currentUser.department, position: { contains: 'Manager', mode: 'insensitive' } },
              { department: 'Human Resources' },
              { employeeId: 'EMP009' }
            ]
          },
          select: { employeeId: true }
        });

        const recipientIds = [...new Set(approvers.map(a => a.employeeId).filter(id => id !== employeeId))];
        if (recipientIds.length > 0) {
          const startDisplay = formatCalendarDate(normStart.date, 'DD-MM-YYYY');
          const endDisplay = formatCalendarDate(normEnd.date, 'DD-MM-YYYY');
          await notificationService.createBulkNotifications(recipientIds, {
            title: `New Leave Request: ${currentUser.name || employeeId}`,
            message: `${currentUser.name} applied for ${requestedDays} day(s) of ${leaveType.name} from ${startDisplay} to ${endDisplay}.`,
            type: 'ACTION_REQUIRED',
            category: 'LEAVE',
            link: '/leave',
            targetTab: 'approvalQueue',
            entityType: 'LEAVE_REQUEST',
            entityId: request.id
          });
        }
      } catch (notifErr) {
        console.warn('Could not dispatch leave notification:', notifErr.message);
      }
    });

    return request;
  }

  async getLeaveRequests(currentUser, filters = {}) {
    const role = (currentUser.role || 'EMPLOYEE').toUpperCase();
    const queryFilters = { ...filters };

    if (role === 'ADMIN') {
      // Admin sees everything or filters by department
    } else if (role === 'MANAGER') {
      queryFilters.department = currentUser.department;
    } else {
      queryFilters.employeeId = currentUser.employeeId;
    }

    return await leaveRepository.getLeaveRequests(queryFilters);
  }

  async getMyRequests(currentUser, filters = {}) {
    return await leaveRepository.getLeaveRequests({
      ...filters,
      employeeId: currentUser.employeeId
    });
  }

  async getLeaveRequestById(id, currentUser) {
    const request = await leaveRepository.getLeaveRequestById(id);
    if (!request) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }

    const role = (currentUser.role || 'EMPLOYEE').toUpperCase();
    if (role === 'EMPLOYEE' && request.employeeId !== currentUser.employeeId) {
      const error = new Error('Access denied: You can only view your own leave requests.');
      error.statusCode = 403;
      throw error;
    }

    if (role === 'MANAGER' && request.employeeId !== currentUser.employeeId) {
      if (request.employee?.department && currentUser.department && request.employee.department.toLowerCase() !== currentUser.department.toLowerCase()) {
        const error = new Error(`Access denied: Managers can only view leave requests from their department (${currentUser.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }

    return request;
  }

  async reviewLeaveRequest(id, reviewData, currentUser) {
    const request = await leaveRepository.getLeaveRequestById(id);
    if (!request) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }

    if (request.status !== 'PENDING') {
      const error = new Error(`Leave request has already been ${request.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    if (currentUser.role === 'MANAGER') {
      if (request.employee?.department && currentUser.department && request.employee.department.toLowerCase() !== currentUser.department.toLowerCase()) {
        const error = new Error(`Forbidden: Managers can only review leave requests from their department (${currentUser.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }

    const status = reviewData.status.toUpperCase();
    const days = request.daysCount;
    const year = normalizeCalendarDate(request.startDate).year;

    const balance = await leaveRepository.getLeaveBalance(request.employeeId, request.leaveTypeId, year);

    let balanceUpdatePromise = Promise.resolve();
    if (status === 'APPROVED' && balance) {
      const newUsed = balance.used + days;
      const newPending = Math.max(0, balance.pending - days);
      const newRemaining = Math.max(0, balance.total - newUsed);
      balanceUpdatePromise = leaveRepository.updateLeaveBalance(balance.id, {
        used: newUsed,
        pending: newPending,
        remaining: newRemaining
      });
    } else if (status === 'REJECTED' && balance) {
      balanceUpdatePromise = leaveRepository.updateLeaveBalance(balance.id, {
        pending: Math.max(0, balance.pending - days)
      });
    }

    const [, updatedRequest] = await Promise.all([
      balanceUpdatePromise,
      leaveRepository.updateLeaveRequest(id, {
        status,
        rejectionReason: status === 'REJECTED' ? (reviewData.rejectionReason || reviewData.comments) : null
      }),
      leaveRepository.createLeaveApproval({
        leaveRequestId: id,
        approverId: currentUser.employeeId,
        approverRole: currentUser.role || 'MANAGER',
        status,
        comments: reviewData.comments || (status === 'APPROVED' ? 'Leave approved' : 'Leave request rejected'),
        actionDate: new Date()
      })
    ]);

    // Notify Employee asynchronously
    setImmediate(() => {
      const startDisplay = formatCalendarDate(request.startDate, 'DD-MM-YYYY');
      const endDisplay = formatCalendarDate(request.endDate, 'DD-MM-YYYY');
      notificationService.createNotification({
        recipientId: request.employeeId,
        title: `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Your request for ${days} day(s) of ${request.leaveType?.name || 'Leave'} (${startDisplay} - ${endDisplay}) was ${status.toLowerCase()} by ${currentUser.name || 'Supervisor'}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        category: 'LEAVE',
        link: '/leave',
        entityType: 'LEAVE_REQUEST',
        entityId: id
      }).catch(err => console.warn('Could not dispatch employee leave notification:', err.message));
    });

    return updatedRequest;
  }

  async cancelLeaveRequest(id, currentUser) {
    const request = await leaveRepository.getLeaveRequestById(id);
    if (!request) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }

    if (request.employeeId !== currentUser.employeeId) {
      const error = new Error('You can only cancel your own leave requests.');
      error.statusCode = 403;
      throw error;
    }

    if (request.status !== 'PENDING') {
      const error = new Error(`Cannot cancel a leave request that is already ${request.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    const year = normalizeCalendarDate(request.startDate).year;
    const balance = await leaveRepository.getLeaveBalance(request.employeeId, request.leaveTypeId, year);
    const [, updated] = await Promise.all([
      balance
        ? leaveRepository.updateLeaveBalance(balance.id, {
            pending: Math.max(0, balance.pending - request.daysCount)
          })
        : Promise.resolve(),
      leaveRepository.updateLeaveRequest(id, { status: 'CANCELLED' })
    ]);

    return updated;
  }

  async getStats(currentUser) {
    const role = (currentUser.role || 'EMPLOYEE').toUpperCase();
    const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
    const targetEmpId = isPrivileged ? undefined : currentUser.employeeId;

    return await leaveRepository.getStats(targetEmpId, 2026);
  }
}

module.exports = new LeaveService();
