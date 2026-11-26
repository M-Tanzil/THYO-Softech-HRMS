const holidayRepository = require('../repositories/holidayRepository');
const leaveRepository = require('../repositories/leaveRepository');
const announcementRepository = require('../repositories/announcementRepository');
const performanceRepository = require('../repositories/performanceRepository');
const recruitmentRepository = require('../repositories/recruitmentRepository');
const wfhRepository = require('../repositories/wfhRepository');
const prisma = require('./prisma');
const cache = require('../utils/cache');

/**
 * Non-blocking startup cache warm-up in small batches so initial page loads
 * hit sub-5ms in-memory caches without spiking Supabase pool connections.
 */
async function warmUpCaches() {
  const t0 = Date.now();
  try {
    await Promise.allSettled([
      cache.wrap('employees_list_ALL', 120000, async () => {
        const sql = `
          SELECT e.id, e."employeeId", e."fullName", e.email, e.phone,
                 e.department, e.designation, e.position, e.status, e."joiningDate",
                 CASE WHEN u.id IS NOT NULL THEN json_build_object('role', u.role, 'isActive', u."isActive") ELSE NULL END AS "user"
          FROM "Employee" e
          LEFT JOIN "User" u ON u."employeeId" = e."employeeId"
          WHERE e.status = 'ACTIVE'
          ORDER BY e."employeeId" ASC
        `;
        return await prisma.$queryRawUnsafe(sql);
      }),
      cache.wrap('emp_metadata', 300000, async () => {
        const employees = await prisma.employee.findMany({
          where: { status: 'ACTIVE' },
          select: { department: true, position: true, designation: true }
        });
        return {
          departments: [...new Set(employees.map(e => e.department).filter(Boolean))].sort(),
          positions: [...new Set(employees.map(e => e.position).filter(Boolean))].sort(),
          designations: [...new Set(employees.map(e => e.designation).filter(Boolean))].sort()
        };
      }),
      holidayRepository.getHolidays({ year: new Date().getFullYear() })
    ]);

    await Promise.allSettled([
      leaveRepository.getLeaveTypes('ACTIVE'),
      leaveRepository.getLeaveRequests({}),
      leaveRepository.getStats(undefined, 2026),
      wfhRepository.getRequests({}),
      wfhRepository.getStats(null, null),
      announcementRepository.getAnnouncements()
    ]);

    await Promise.allSettled([
      performanceRepository.getCycles(),
      performanceRepository.getGoals({}),
      performanceRepository.getReviews({}),
      performanceRepository.getFeedbacks(),
      recruitmentRepository.getJobPostings({}),
      recruitmentRepository.getRequisitions({}),
      recruitmentRepository.getApplications({}),
      recruitmentRepository.getCandidates({}),
      recruitmentRepository.getInterviews({}),
      recruitmentRepository.getOffers({})
    ]);

    console.log(`✓ Cache warm-up completed in ${Date.now() - t0}ms`);
  } catch (err) {
    console.warn('Cache warm-up warning:', err.message);
  }
}

module.exports = { warmUpCaches };
