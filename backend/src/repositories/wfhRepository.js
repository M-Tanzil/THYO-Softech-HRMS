const prisma = require('../config/prisma');
const cache = require('../utils/cache');

class WfhRepository {
  invalidateWfhCaches() {
    cache.delPrefix('wfh_');
  }

  async createRequest(data) {
    this.invalidateWfhCaches();
    const days = data.days !== undefined ? Number(data.days) : (data.daysCount !== undefined ? Number(data.daysCount) : 1.0);
    return await prisma.wfhRequest.create({
      data: {
        id: data.id || undefined,
        employeeId: data.employeeId,
        employeeName: data.employeeName || null,
        employeeRole: data.employeeRole || null,
        department: data.department || null,
        startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate),
        endDate: data.endDate instanceof Date ? data.endDate : new Date(data.endDate),
        daysCount: days,
        days: days,
        reason: data.reason,
        remarks: data.remarks || null,
        contactNumber: data.contactNumber || null,
        equipmentConfirmed: data.equipmentConfirmed !== undefined ? Boolean(data.equipmentConfirmed) : true,
        vpnSecured: data.vpnSecured !== undefined ? Boolean(data.vpnSecured) : true,
        tasksPlanned: data.tasksPlanned || null,
        status: data.status || 'Pending',
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : new Date(),
        approvedBy: data.approvedBy || 'Pending Review',
        approverNote: data.approverNote || null,
        rejectionReason: data.rejectionReason || null
      },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            department: true,
            position: true,
            email: true
          }
        }
      }
    });
  }

  async getRequests(filterParams = {}) {
    const { employeeId, department, status, limit = 100, offset = 0 } = filterParams;
    const cacheKey = `wfh_requests_${JSON.stringify({ employeeId, department, status, limit, offset })}`;

    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];

      if (employeeId) {
        params.push(employeeId);
        conditions.push(`w."employeeId" = $${params.length}`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(w.status) = LOWER($${params.length})`);
      }
      if (department && department !== 'All') {
        params.push(department);
        conditions.push(`LOWER(w.department) = LOWER($${params.length})`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const takeVal = Math.max(1, Math.min(200, Number(limit) || 100));
      const skipVal = Math.max(0, Number(offset) || 0);
      params.push(takeVal, skipVal);

      const sql = `
        SELECT
          w.id, w."employeeId", w."employeeName", w."employeeRole", w.department,
          w."startDate", w."endDate", w."daysCount", w.days, w.reason, w.remarks,
          w."contactNumber", w."equipmentConfirmed", w."vpnSecured", w."tasksPlanned",
          w.status, w."approvedBy", w."approverId", w."approverNote", w."rejectionReason",
          w."appliedDate", w."approvedAt", w."createdAt", w."updatedAt",
          CASE WHEN e."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', e."employeeId",
              'fullName', e."fullName",
              'department', e.department,
              'position', e.position,
              'email', e.email
            )
          ELSE NULL END AS employee,
          CASE WHEN appr."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', appr."employeeId",
              'fullName', appr."fullName",
              'designation', appr.designation
            )
          ELSE NULL END AS approver,
          COUNT(*) OVER()::int AS "_total"
        FROM "WfhRequest" w
        LEFT JOIN "Employee" e ON e."employeeId" = w."employeeId"
        LEFT JOIN "Employee" appr ON appr."employeeId" = w."approverId"
        ${whereSql}
        ORDER BY w."appliedDate" DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const rows = await prisma.$queryRawUnsafe(sql, ...params);
      const total = rows.length > 0 ? Number(rows[0]._total) : 0;
      const requests = rows.map(({ _total, ...rest }) => rest);
      return { requests, total };
    });
  }

  async getRequestById(id) {
    return await prisma.wfhRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            department: true,
            position: true,
            email: true
          }
        },
        approver: {
          select: {
            employeeId: true,
            fullName: true,
            designation: true
          }
        }
      }
    });
  }

  async updateStatus(id, { status, approverId, approverName, approverNote, rejectionReason }) {
    this.invalidateWfhCaches();
    const isApproved = status.toUpperCase() === 'APPROVED';
    const isRejected = status.toUpperCase() === 'REJECTED';

    return await prisma.wfhRequest.update({
      where: { id },
      data: {
        status: isApproved ? 'Approved' : (isRejected ? 'Rejected' : status),
        approverId: approverId || undefined,
        approvedBy: approverName || (isApproved ? 'Manager' : undefined),
        approverNote: approverNote || undefined,
        rejectionReason: rejectionReason || undefined,
        approvedAt: isApproved ? new Date() : null
      },
      include: {
        employee: true,
        approver: true
      }
    });
  }

  async cancelRequest(id, employeeId) {
    this.invalidateWfhCaches();
    return await prisma.wfhRequest.updateMany({
      where: { id, employeeId, status: { in: ['Pending', 'PENDING'] } },
      data: { status: 'Cancelled' }
    });
  }

  async getStats(employeeId = null, department = null) {
    const cacheKey = `wfh_stats_${employeeId || 'all'}_${department || 'all'}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const where = {};
      if (employeeId) where.employeeId = employeeId;
      if (department && department !== 'All') where.department = { equals: department, mode: 'insensitive' };

      const groups = await prisma.wfhRequest.groupBy({
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

module.exports = new WfhRepository();
