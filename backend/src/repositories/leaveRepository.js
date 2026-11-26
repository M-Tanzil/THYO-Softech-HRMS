const prisma = require('../config/prisma');
const cache = require('../utils/cache');

class LeaveRepository {
  async getLeaveTypes(status = 'ACTIVE') {
    const cacheKey = `leave_types_${status || 'ALL'}`;
    return await cache.wrapSWR(cacheKey, 600000, 1800000, async () => {
      const where = status ? { status } : {};
      return await prisma.leaveType.findMany({
        where,
        orderBy: { code: 'asc' }
      });
    });
  }

  async getLeaveTypeById(id) {
    return await prisma.leaveType.findUnique({
      where: { id }
    });
  }

  async getLeaveTypeByCode(code) {
    return await prisma.leaveType.findUnique({
      where: { code }
    });
  }

  async createLeaveType(data) {
    cache.delPrefix('leave_types_');
    return await prisma.leaveType.create({ data });
  }

  invalidateLeaveCaches() {
    cache.delPrefix('leave_balances_');
    cache.delPrefix('leave_requests_');
    cache.delPrefix('leave_stats_');
  }

  async getLeaveBalances(employeeId, year = 2026) {
    const cacheKey = `leave_balances_${employeeId}_${year}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const sql = `
        SELECT
          lb.id, lb."employeeId", lb."leaveTypeId", lb.year,
          lb.allocated, lb.used, lb.pending, lb."carriedForward", lb.total, lb.remaining,
          lb."createdAt", lb."updatedAt",
          json_build_object(
            'id', lt.id,
            'code', lt.code,
            'name', lt.name,
            'description', lt.description,
            'defaultDays', lt."defaultDays",
            'isPaid', lt."isPaid",
            'carryForward', lt."carryForward",
            'maxCarryForward', lt."maxCarryForward",
            'requiresProof', lt."requiresProof",
            'status', lt.status
          ) AS "leaveType"
        FROM "LeaveBalance" lb
        JOIN "LeaveType" lt ON lt.id = lb."leaveTypeId"
        WHERE lb."employeeId" = $1 AND lb.year = $2
        ORDER BY lt.code ASC
      `;
      return await prisma.$queryRawUnsafe(sql, employeeId, Number(year));
    });
  }

  async getLeaveBalance(employeeId, leaveTypeId, year = 2026) {
    return await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year: Number(year)
        }
      },
      include: {
        leaveType: true
      }
    });
  }

  async updateLeaveBalance(id, data) {
    this.invalidateLeaveCaches();
    return await prisma.leaveBalance.update({
      where: { id },
      data
    });
  }

  async createLeaveRequest(data) {
    this.invalidateLeaveCaches();
    return await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate),
        endDate: data.endDate instanceof Date ? data.endDate : new Date(data.endDate),
        daysCount: Number(data.daysCount || 1.0),
        isHalfDay: Boolean(data.isHalfDay),
        halfDaySession: data.halfDaySession || null,
        reason: data.reason,
        documentUrl: data.documentUrl || null,
        contactNumber: data.contactNumber || null,
        status: data.status || 'PENDING',
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : new Date()
      },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            email: true,
            department: true,
            position: true
          }
        },
        leaveType: true
      }
    });
  }

  async getLeaveRequests(filterParams = {}) {
    const {
      employeeId,
      department,
      status,
      leaveTypeId,
      year,
      limit = 100,
      offset = 0
    } = filterParams;

    const cacheKey = `leave_requests_${JSON.stringify({ employeeId, department, status, leaveTypeId, year, limit, offset })}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];

      if (employeeId) {
        params.push(employeeId);
        conditions.push(`lr."employeeId" = $${params.length}`);
      }
      if (status && status !== 'ALL') {
        params.push(status);
        conditions.push(`LOWER(lr.status) = LOWER($${params.length})`);
      }
      if (leaveTypeId && leaveTypeId !== 'ALL') {
        params.push(leaveTypeId);
        conditions.push(`lr."leaveTypeId" = $${params.length}::uuid`);
      }
      if (department && department !== 'ALL') {
        params.push(department);
        conditions.push(`LOWER(e.department) = LOWER($${params.length})`);
      }
      if (year) {
        params.push(new Date(`${year}-01-01T00:00:00.000Z`));
        conditions.push(`lr."startDate" >= $${params.length}`);
        params.push(new Date(`${year}-12-31T23:59:59.999Z`));
        conditions.push(`lr."startDate" <= $${params.length}`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const takeVal = Math.max(1, Math.min(200, Number(limit) || 100));
      const skipVal = Math.max(0, Number(offset) || 0);
      params.push(takeVal, skipVal);

      const sql = `
        SELECT
          lr.id, lr."employeeId", lr."leaveTypeId", lr."startDate", lr."endDate",
          lr."daysCount", lr."isHalfDay", lr."halfDaySession", lr.reason, lr."documentUrl",
          lr."contactNumber", lr.status, lr."rejectionReason", lr."appliedDate",
          lr."createdAt", lr."updatedAt",
          CASE WHEN e."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', e."employeeId",
              'fullName', e."fullName",
              'email', e.email,
              'department', e.department,
              'position', e.position
            )
          ELSE NULL END AS employee,
          CASE WHEN lt.id IS NOT NULL THEN
            json_build_object(
              'id', lt.id,
              'code', lt.code,
              'name', lt.name,
              'defaultDays', lt."defaultDays",
              'isPaid', lt."isPaid"
            )
          ELSE NULL END AS "leaveType",
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', la.id,
                'leaveRequestId', la."leaveRequestId",
                'approverId', la."approverId",
                'approverRole', la."approverRole",
                'status', la.status,
                'comments', la.comments,
                'actionDate', la."actionDate",
                'approver', CASE WHEN appr."employeeId" IS NOT NULL THEN
                  json_build_object(
                    'employeeId', appr."employeeId",
                    'fullName', appr."fullName",
                    'designation', appr.designation
                  )
                ELSE NULL END
              )
            )
            FROM "LeaveApproval" la
            LEFT JOIN "Employee" appr ON appr."employeeId" = la."approverId"
            WHERE la."leaveRequestId" = lr.id),
            '[]'::json
          ) AS approvals,
          COUNT(*) OVER()::int AS "_total"
        FROM "LeaveRequest" lr
        LEFT JOIN "Employee" e ON e."employeeId" = lr."employeeId"
        LEFT JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
        ${whereSql}
        ORDER BY lr."appliedDate" DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const rows = await prisma.$queryRawUnsafe(sql, ...params);
      const total = rows.length > 0 ? Number(rows[0]._total) : 0;
      const requests = rows.map(({ _total, ...rest }) => rest);
      return { requests, total };
    });
  }

  async getLeaveRequestById(id) {
    return await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            email: true,
            department: true,
            position: true
          }
        },
        leaveType: true,
        approvals: {
          include: {
            approver: {
              select: {
                employeeId: true,
                fullName: true,
                designation: true
              }
            }
          }
        }
      }
    });
  }

  async updateLeaveRequest(id, data) {
    this.invalidateLeaveCaches();
    return await prisma.leaveRequest.update({
      where: { id },
      data,
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            email: true,
            department: true,
            position: true
          }
        },
        leaveType: true
      }
    });
  }

  async createLeaveApproval(data) {
    this.invalidateLeaveCaches();
    return await prisma.leaveApproval.create({
      data: {
        leaveRequestId: data.leaveRequestId,
        approverId: data.approverId,
        approverRole: data.approverRole || 'MANAGER',
        status: data.status || 'PENDING',
        comments: data.comments || null,
        actionDate: data.actionDate ? new Date(data.actionDate) : new Date()
      }
    });
  }

  async getStats(employeeId, year = 2026) {
    const cacheKey = `leave_stats_${employeeId || 'all'}_${year}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const where = employeeId ? { employeeId } : {};
      const groups = await prisma.leaveRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
        where
      });

      let total = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;

      for (const g of groups) {
        const count = g._count._all;
        total += count;
        const s = (g.status || '').toUpperCase();
        if (s === 'PENDING') pending += count;
        else if (s === 'APPROVED') approved += count;
        else if (s === 'REJECTED') rejected += count;
      }

      return { total, pending, approved, rejected };
    });
  }
}

module.exports = new LeaveRepository();
