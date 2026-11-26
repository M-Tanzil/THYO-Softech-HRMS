const app = require('./src/app');
const prisma = require('./src/config/prisma');

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('  THYO SOFTECH HRMS - STRICT 3-ROLE RBAC VERIFICATION SUITE     ');
  console.log('  Roles: ADMIN, MANAGER, EMPLOYEE                              ');
  console.log('================================================================\n');

  // Start app on ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Ephemeral test server listening on ${baseUrl}\n`);

  async function api(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { status: res.status, body: data };
  }

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ============================================================================
    // PART 1: VERIFY DATABASE ROLE AUDIT (STRICTLY 3 ROLES ONLY)
    // ============================================================================
    console.log('--- 1. AUDIT DATABASE ROLES (STRICT 3-ROLE ENFORCEMENT) ---');
    const allUsers = await prisma.user.findMany({
      select: { username: true, role: true, employeeId: true }
    });

    const forbiddenRoles = allUsers.filter(u => u.role !== 'ADMIN' && u.role !== 'MANAGER' && u.role !== 'EMPLOYEE');
    assert(forbiddenRoles.length === 0, `Zero users have invalid roles outside [ADMIN, MANAGER, EMPLOYEE] (found: ${forbiddenRoles.length})`);

    const distinctRoles = [...new Set(allUsers.map(u => u.role))];
    console.log('  Active roles present in database:', distinctRoles);
    assert(
      distinctRoles.every(r => ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(r)),
      'All users belong strictly to ADMIN, MANAGER, or EMPLOYEE'
    );

    // Verify key test accounts
    const adminUser = allUsers.find(u => u.username === 'admin');
    const managerUser = allUsers.find(u => u.username === 'tanzil');
    const employeeUser = allUsers.find(u => u.username === 'riya');

    assert(adminUser && adminUser.role === 'ADMIN', 'admin account (EMP009) is verified ADMIN');
    assert(managerUser && managerUser.role === 'MANAGER', 'tanzil account (EMP002) is verified MANAGER');
    assert(employeeUser && employeeUser.role === 'EMPLOYEE', 'riya account (EMP003) is verified EMPLOYEE');

    // ============================================================================
    // PART 2: REAL BCRYPT AUTHENTICATION & AUTOMATIC ROLE DETERMINATION
    // ============================================================================
    console.log('\n--- 2. REAL BCRYPT AUTHENTICATION & AUTOMATIC ROLE DETECTION ---');

    // Login Admin
    const loginAdmin = await api('POST', '/api/auth/login', { identifier: 'admin', password: 'Admin@12345' });
    assert(loginAdmin.status === 200, 'Admin login successful (200 OK)');
    assert(loginAdmin.body.token && loginAdmin.body.user.role === 'ADMIN', 'Admin automatically receives valid JWT and role ADMIN');
    const adminToken = loginAdmin.body.token;

    // Login Manager
    const loginManager = await api('POST', '/api/auth/login', { identifier: 'tanzil', password: 'Employee@12345' });
    assert(loginManager.status === 200, 'Manager login successful (200 OK)');
    assert(loginManager.body.token && loginManager.body.user.role === 'MANAGER', 'Manager automatically receives valid JWT and role MANAGER');
    const managerToken = loginManager.body.token;

    // Login Employee
    const loginEmployee = await api('POST', '/api/auth/login', { identifier: 'riya', password: 'Employee@12345' });
    assert(loginEmployee.status === 200, 'Employee login successful (200 OK)');
    assert(loginEmployee.body.token && loginEmployee.body.user.role === 'EMPLOYEE', 'Employee automatically receives valid JWT and role EMPLOYEE');
    const employeeToken = loginEmployee.body.token;

    // Session validation via /api/auth/me
    const meAdmin = await api('GET', '/api/auth/me', null, adminToken);
    assert(meAdmin.status === 200 && meAdmin.body.user.role === 'ADMIN', '/api/auth/me automatically identifies ADMIN');

    const meManager = await api('GET', '/api/auth/me', null, managerToken);
    assert(meManager.status === 200 && meManager.body.user.role === 'MANAGER', '/api/auth/me automatically identifies MANAGER');

    const meEmployee = await api('GET', '/api/auth/me', null, employeeToken);
    assert(meEmployee.status === 200 && meEmployee.body.user.role === 'EMPLOYEE', '/api/auth/me automatically identifies EMPLOYEE');

    // ============================================================================
    // PART 3: STUDENT 5 MODULE — ANNOUNCEMENTS RBAC
    // ============================================================================
    console.log('\n--- 3. ANNOUNCEMENTS RBAC (ADMIN-ONLY CREATION & DELETION) ---');

    // Admin creates announcement -> 201 Created
    const createAnn = await api('POST', '/api/announcements', {
      title: 'E2E Automated System Announcement',
      content: 'Official notice regarding RBAC upgrade across all departments.',
      priority: 'MEDIUM'
    }, adminToken);
    assert(createAnn.status === 201, 'Admin can create company announcement (201 Created)');
    const announcementId = createAnn.body.data.id;

    // Manager attempts to create announcement -> 403 Forbidden
    const mgrCreateAnn = await api('POST', '/api/announcements', {
      title: 'Unauthorized Manager Announcement',
      content: 'Manager should not have broadcast privileges.',
      priority: 'LOW'
    }, managerToken);
    assert(mgrCreateAnn.status === 403, 'Manager announcement creation blocked by backend with 403 Forbidden');

    // Employee attempts to create announcement -> 403 Forbidden
    const empCreateAnn = await api('POST', '/api/announcements', {
      title: 'Unauthorized Employee Announcement',
      content: 'Employee should not have broadcast privileges.',
      priority: 'LOW'
    }, employeeToken);
    assert(empCreateAnn.status === 403, 'Employee announcement creation blocked by backend with 403 Forbidden');

    // Employee acknowledges announcement -> 200 OK
    const ackAnn = await api('POST', `/api/announcements/${announcementId}/acknowledge`, {}, employeeToken);
    assert(ackAnn.status === 200, 'Employee can view and acknowledge announcement (200 OK)');

    // Employee attempts to delete announcement -> 403 Forbidden
    const empDeleteAnn = await api('DELETE', `/api/announcements/${announcementId}`, null, employeeToken);
    assert(empDeleteAnn.status === 403, 'Employee announcement deletion blocked with 403 Forbidden');

    // Manager attempts to delete announcement -> 403 Forbidden
    const mgrDeleteAnn = await api('DELETE', `/api/announcements/${announcementId}`, null, managerToken);
    assert(mgrDeleteAnn.status === 403, 'Manager announcement deletion blocked with 403 Forbidden');

    // Admin deletes announcement -> 200 OK
    const adminDeleteAnn = await api('DELETE', `/api/announcements/${announcementId}`, null, adminToken);
    assert(adminDeleteAnn.status === 200, 'Admin can delete announcement (200 OK)');

    // ============================================================================
    // PART 4: STUDENT 5 MODULE — LEAVE MANAGEMENT RBAC
    // ============================================================================
    console.log('\n--- 4. LEAVE MANAGEMENT RBAC ---');

    // Admin manages Leave Types
    const createLt = await api('POST', '/api/leave/types', {
      name: 'E2E Sabbatical Leave',
      code: 'E2E_SAB',
      defaultDays: 15,
      requiresApproval: true
    }, adminToken);
    assert(createLt.status === 201, 'Admin can create corporate leave types (201 Created)');
    const leaveTypeId = createLt.body.data.id;

    // Manager blocked from creating leave types
    const mgrLt = await api('POST', '/api/leave/types', {
      name: 'Manager Rogue Leave',
      code: 'MGR_ROGUE',
      defaultDays: 10
    }, managerToken);
    assert(mgrLt.status === 403, 'Manager creating leave types blocked with 403 Forbidden');

    // Employee blocked from creating leave types
    const empLt = await api('POST', '/api/leave/types', {
      name: 'Employee Rogue Leave',
      code: 'EMP_ROGUE',
      defaultDays: 10
    }, employeeToken);
    assert(empLt.status === 403, 'Employee creating leave types blocked with 403 Forbidden');

    // Clean up created leave type
    await api('DELETE', `/api/leave/types/${leaveTypeId}`, null, adminToken);

    // Employee blocked from reviewing leave requests
    const empReview = await api('PUT', '/api/leave/test-leave-id/review', {
      status: 'APPROVED'
    }, employeeToken);
    assert(empReview.status === 403, 'Employee reviewing leave requests blocked with 403 Forbidden');

    // ============================================================================
    // PART 5: STUDENT 5 MODULE — RECRUITMENT RBAC
    // ============================================================================
    console.log('\n--- 5. RECRUITMENT RBAC ---');

    // Manager can view candidates
    const mgrCandidates = await api('GET', '/api/recruitment/candidates', null, managerToken);
    assert(mgrCandidates.status === 200, 'Manager can access candidate talent pipeline (200 OK)');

    // Employee blocked from viewing candidates
    const empCandidates = await api('GET', '/api/recruitment/candidates', null, employeeToken);
    assert(empCandidates.status === 403, 'Employee viewing candidates blocked with 403 Forbidden');

    // Manager blocked from viewing offers (Admin-only)
    const mgrOffers = await api('GET', '/api/recruitment/offers', null, managerToken);
    assert(mgrOffers.status === 403, 'Manager viewing employment offers blocked with 403 Forbidden');

    // Admin can view offers
    const adminOffers = await api('GET', '/api/recruitment/offers', null, adminToken);
    assert(adminOffers.status === 200, 'Admin can access recruitment offers and compensation (200 OK)');

    // ============================================================================
    // PART 6: STUDENT 5 MODULE — PERFORMANCE RBAC
    // ============================================================================
    console.log('\n--- 6. PERFORMANCE RBAC ---');

    // Employee cannot create appraisal cycles
    const empCycle = await api('POST', '/api/performance/cycles', {
      name: 'Unauthorized Q4 Review',
      cycleType: 'ANNUAL',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString()
    }, employeeToken);
    assert(empCycle.status === 403, 'Employee creating appraisal cycles blocked with 403 Forbidden');

    // Manager cannot create appraisal cycles
    const mgrCycle = await api('POST', '/api/performance/cycles', {
      name: 'Manager Q4 Review',
      cycleType: 'ANNUAL',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString()
    }, managerToken);
    assert(mgrCycle.status === 403, 'Manager creating appraisal cycles blocked with 403 Forbidden');

    // Employee blocked from submitting manager appraisal evaluations
    const empEval = await api('PUT', '/api/performance/reviews/test-id/evaluate', {
      managerRating: 5,
      managerComments: 'Self-appointed outstanding rating'
    }, employeeToken);
    assert(empEval.status === 403, 'Employee evaluating colleague reviews blocked with 403 Forbidden');

    // ============================================================================
    // PART 7: STUDENT 5 MODULE — WORK FROM HOME (WFH) RBAC
    // ============================================================================
    console.log('\n--- 7. WORK FROM HOME (WFH) RBAC ---');

    // Employee blocked from reviewing team WFH requests
    const empWfhReview = await api('PUT', '/api/wfh/test-id/review', {
      status: 'APPROVED'
    }, employeeToken);
    assert(empWfhReview.status === 403, 'Employee reviewing team WFH requests blocked with 403 Forbidden');

    // ============================================================================
    // PART 8: STUDENT 5 MODULE — HOLIDAYS RBAC
    // ============================================================================
    console.log('\n--- 8. HOLIDAYS RBAC ---');

    // Employee can view holidays
    const empHolidays = await api('GET', '/api/holidays', null, employeeToken);
    assert(empHolidays.status === 200, 'Employee can view holiday calendar (200 OK)');

    // Employee blocked from creating holiday
    const empCreateHol = await api('POST', '/api/holidays', {
      title: 'Employee Day Off',
      date: new Date().toISOString()
    }, employeeToken);
    assert(empCreateHol.status === 403, 'Employee creating holidays blocked with 403 Forbidden');

    // Manager blocked from creating holiday
    const mgrCreateHol = await api('POST', '/api/holidays', {
      title: 'Manager Day Off',
      date: new Date().toISOString()
    }, managerToken);
    assert(mgrCreateHol.status === 403, 'Manager creating holidays blocked with 403 Forbidden');

    console.log('\n================================================================');
    console.log(`  VERIFICATION COMPLETED: ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\nVerification encountered error:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit();
  }
}

runEndToEndVerification();
