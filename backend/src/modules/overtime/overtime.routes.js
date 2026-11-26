
import { Router } from "express";

import {
  getOvertimeRecordsController,
  getEmployeesOvertimeAuthorizationController,
  approveOvertimeController,
  rejectOvertimeController,
  updateEmployeeOvertimeAuthorizationController,
  createOvertimeRequestController,
  getOvertimeRequestsController,
  approveOvertimeRequestController,
  rejectOvertimeRequestController,
} from "./overtime.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../../middlewares/auth.middleware.js";

import {
  loadAccessContext,
  requireEmployeeContext,
} from "../../middlewares/access.middleware.js";

const router = Router();

// All overtime routes require authentication and employee context.
router.use(authenticate, loadAccessContext, requireEmployeeContext);

// --------------------------------------------------
// EXISTING ATTENDANCE-GENERATED OVERTIME
// --------------------------------------------------

router.get("/", getOvertimeRecordsController);

router.get(
  "/employees/authorization",
  authorizeRoles("ADMIN", "MANAGER"),
  getEmployeesOvertimeAuthorizationController
);

router.patch(
  "/:id/approve",
  authorizeRoles("ADMIN", "MANAGER"),
  approveOvertimeController
);

router.patch(
  "/:id/reject",
  authorizeRoles("ADMIN", "MANAGER"),
  rejectOvertimeController
);

// --------------------------------------------------
// MANUAL OVERTIME REQUESTS
// --------------------------------------------------

// Employees and managers can submit their own requests.
router.post(
  "/requests",
  authorizeRoles("EMPLOYEE", "MANAGER"),
  createOvertimeRequestController
);

// Admin, manager and employee can view requests.
// Data scope is enforced in the controller/service.
router.get(
  "/requests",
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  getOvertimeRequestsController
);

// Admin and managers can approve/reject requests.
router.patch(
  "/requests/:id/approve",
  authorizeRoles("ADMIN", "MANAGER"),
  approveOvertimeRequestController
);

router.patch(
  "/requests/:id/reject",
  authorizeRoles("ADMIN", "MANAGER"),
  rejectOvertimeRequestController
);

// --------------------------------------------------
// EMPLOYEE OVERTIME AUTHORIZATION
// --------------------------------------------------

router.patch(
  "/employees/:employeeId/authorization",
  authorizeRoles("ADMIN", "MANAGER"),
  updateEmployeeOvertimeAuthorizationController
);

export default router;
