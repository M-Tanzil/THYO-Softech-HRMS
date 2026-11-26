# THYO SOFTECH PVT LTD – HRMS
## Team Integration Guide: Task Management Module

> **Attention HRMS Engineering Team (Teammates 1, 2, 3, 4 & 5):**
> 
> This document provides complete, production-grade instructions for integrating the **Task Management Module** into the centralized **THYO SOFTECH PVT LTD HRMS** monolith.
>
> Developed by **Student 5 (Task Management Specialist)**.

---

### 1. Database Architecture & Table Ownership

To ensure seamless integration across all 5 HRMS modules (Authentication, Attendance, Payroll, Leave, and Task Management) without duplicating records or conflicting on foreign keys, tables are strictly partitioned into **Shared Central HRMS Tables** and **Task Management Module Tables**.

#### 1.1 Shared Central HRMS Tables (Common to All Modules)

These tables belong to the entire HRMS and must **never** be duplicated by individual modules. They are shared directly by Attendance, Payroll, Leave Management, and Task Management:

| Table | Purpose | Shared By | Primary Key / Unique |
| :--- | :--- | :--- | :--- |
| **`User`** | System credentials, login identity, global role, active status | All Modules | `id` (UUID), `email` (Unique), `username` (Unique) |
| **`Employee`** | Master employee profile, department, position, contact info | All Modules | `id` (UUID), `employeeId` / `employeeCode` (Unique) |
| **`AuditLog`** | Global security audit trail for compliance and tracking | All Modules | `id` (UUID) |

*Relationship*: `User.employeeId` references `Employee.employeeId` (1-to-1 relationship).

#### 1.2 Task Management Specific Tables

These tables are managed solely by the Task Management module. In `prisma/schema.prisma`, merge these definitions:

```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
  OVERDUE
}

enum AssignmentType {
  INDIVIDUAL
  MULTIPLE
  DEPARTMENT
  POSITION
  ALL
}

model Task {
  id             String           @id @default(uuid())
  title          String
  description    String           @db.Text
  category       String           @default("General")
  priority       Priority         @default(MEDIUM)
  status         TaskStatus       @default(PENDING)
  deadline       DateTime
  estimatedHours Float            @default(0)
  assignmentType AssignmentType   @default(INDIVIDUAL)
  targetValue    String?
  attachmentUrl  String?
  tags           String?
  createdBy      String           // References Employee.employeeId or User.id
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  assignments    TaskAssignment[]
  comments       TaskComment[]
  history        TaskHistory[]

  @@index([priority])
  @@index([status])
  @@index([deadline])
  @@index([createdBy])
}

model TaskAssignment {
  id          String        @id @default(uuid())
  taskId      String
  employeeId  String        // Foreign key referencing common Employee.employeeId
  status      TaskStatus    @default(PENDING)
  progress    Int           @default(0) // 0, 25, 50, 75, 100
  assignedAt  DateTime      @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  updatedAt   DateTime      @updatedAt

  task        Task          @relation(fields: [taskId], references: [id], onDelete: Cascade)
  employee    Employee      @relation(fields: [employeeId], references: [employeeId], onDelete: Cascade)
  comments    TaskComment[]

  @@unique([taskId, employeeId])
  @@index([employeeId])
  @@index([status])
}

model TaskHistory {
  id          String      @id @default(uuid())
  taskId      String
  employeeId  String?     // Foreign key referencing Employee.employeeId
  action      String      // TASK_CREATED, STATUS_UPDATED, PROGRESS_UPDATED, TASK_REASSIGNED, COMMENT_ADDED
  oldStatus   TaskStatus?
  newStatus   TaskStatus?
  description String
  createdAt   DateTime    @default(now())

  task        Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  employee    Employee?   @relation(fields: [employeeId], references: [employeeId])

  @@index([taskId])
  @@index([createdAt])
}

model TaskComment {
  id               String          @id @default(uuid())
  taskId           String
  taskAssignmentId String?
  employeeId       String          // Foreign key referencing Employee.employeeId
  authorName       String
  comment          String          @db.Text
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  task             Task            @relation(fields: [taskId], references: [id], onDelete: Cascade)
  assignment       TaskAssignment? @relation(fields: [taskAssignmentId], references: [id], onDelete: SetNull)
  employee         Employee        @relation(fields: [employeeId], references: [employeeId], onDelete: Cascade)

  @@index([taskId])
  @@index([employeeId])
}

model Notification {
  id          String    @id @default(uuid())
  recipientId String    // Foreign key referencing Employee.employeeId
  title       String
  message     String    @db.Text
  type        String    @default("INFO")
  link        String?
  isRead      Boolean   @default(false)
  createdAt   DateTime  @default(now())

  employee    Employee  @relation(fields: [recipientId], references: [employeeId], onDelete: Cascade)

  @@index([recipientId])
  @@index([isRead])
}

model Announcement {
  id          String    @id @default(uuid())
  title       String
  message     String    @db.Text
  audience    String    @default("ALL") // ALL, DEPARTMENT, POSITION, INDIVIDUAL
  targetValue String?
  publishDate DateTime  @default(now())
  expiryDate  DateTime?
  createdById String    // References Employee.employeeId or User.id
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([audience])
  @@index([publishDate])
}
```

---

### 2. Authentication & Identity Integration

#### 2.1 Central HRMS Authentication Architecture

The Task Management module **does not** expose any login or registration pages. Instead, it directly consumes the authenticated identity from the centralized HRMS authentication module.

The central authentication layer provides:
- `req.user.id` / `req.user.userId`
- `req.user.employeeId`
- `req.user.name` / `req.user.fullName`
- `req.user.role` (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE`)
- `req.user.department`
- `req.user.token` / session information

#### 2.2 Integration Boundary (`backend/src/middleware/authMiddleware.js`)

The module exports three decoupled authentication components:

1. **`commonHrmsAuthMiddleware`**:
   The production-grade adapter that verifies central HRMS JWT Bearer tokens, looks up the real employee/user record in PostgreSQL, and verifies active status.
2. **`devAuthAdapter`**:
   A lightweight development adapter active only during local testing (`NODE_ENV !== 'production'`). Allows teammates to test Task Management immediately using headers (`x-employee-id`, `x-user-role`) without requiring the Auth service to be running.
3. **`authenticateUser`**:
   The unified gateway. If your upstream central authentication middleware has already executed and attached `req.user`, `authenticateUser` automatically detects it and continues seamlessly.

#### 2.3 How Teammate 1 (Central Auth) Plugs In

When connecting the monolithic HRMS backend in `server.js` or `app.js`:

```javascript
// Option A: Central Auth middleware runs upstream
app.use(centralAuthMiddleware); // Teammate 1's middleware sets req.user
app.use('/api/tasks', taskRoutes); // Task module automatically consumes req.user

// Option B: Pass Bearer token directly
// Task module verifies JWT token signed with JWT_SECRET and attaches verified req.user
app.use('/api/tasks', taskRoutes);
```

To disable the development testing adapter in production:
```env
NODE_ENV=production
ENABLE_DEV_AUTH=false
```

---

### 3. Role-Based Access Control (RBAC) Standard

The Task Management module strictly enforces permissions on the **Express backend**:

| Action / Capability | ADMIN | HR | MANAGER | EMPLOYEE | Enforced In |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Create Task** | ✅ | ✅ | ✅ (Own department only) | ❌ (403 Forbidden) | `requireRole('ADMIN', 'HR', 'MANAGER')` |
| **Assign / Reassign Task** | ✅ | ✅ | ✅ (Own department only) | ❌ (403 Forbidden) | `requireRole('ADMIN', 'HR', 'MANAGER')` |
| **Edit Task Details** | ✅ | ✅ | ✅ (Created/department tasks) | ❌ (403 Forbidden) | `requireRole('ADMIN', 'HR', 'MANAGER')` |
| **Delete Task** | ✅ | ❌ | ❌ | ❌ (403 Forbidden) | `requireRole('ADMIN')` |
| **View Task Reports & Export CSV** | ✅ | ✅ | ✅ (Department scope) | ❌ (403 Forbidden) | `requireRole('ADMIN', 'HR', 'MANAGER')` |
| **View Task List (`GET /api/tasks`)** | ✅ (All) | ✅ (All) | ✅ (Department scoped) | ✅ (Assigned only) | `taskController.getTasks` query scoping |
| **View Single Task (`GET /api/tasks/:id`)** | ✅ | ✅ | ✅ (Department/assigned) | ✅ (Assigned only) | `requireTaskAccess('view')` |
| **Update Status & Progress (0%-100%)** | ✅ | ✅ | ✅ | ✅ (Assigned task only) | `requireTaskAccess('update status on')` |
| **Add Comments (`POST /api/tasks/:id/comments`)** | ✅ | ✅ | ✅ | ✅ (Assigned task only) | `requireTaskAccess('comment on')` |
| **View Comments (`GET /api/tasks/:id/comments`)** | ✅ | ✅ | ✅ | ✅ (Assigned task only) | `requireTaskAccess('view comments on')` |
| **View / Mark Notifications** | ✅ | ✅ | ✅ | ✅ (Own notifications) | `notificationController` scoped to `req.user.employeeId` |

---

### 4. Complete REST API Reference

All endpoints are hosted under `/api`.

#### 4.1 Tasks API

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Everyone | List tasks (automatically filtered by role: Employees see assigned, Managers see department, Admin/HR see all) |
| `POST` | `/api/tasks` | `ADMIN`, `HR`, `MANAGER` | Create and assign a task to individual, multiple, department, position, or all |
| `GET` | `/api/tasks/:id` | Admin/HR/Manager or Assigned Employee | Retrieve task details, assignments, comments, and audit history |
| `PUT` | `/api/tasks/:id` | `ADMIN`, `HR`, `MANAGER` | Update title, description, priority, deadline, estimated hours, tags |
| `DELETE` | `/api/tasks/:id` | `ADMIN` | Permanently remove a task and cascade relations |
| `PATCH` | `/api/tasks/:id/status` | Admin/HR/Manager or Assigned Employee | Update task milestone status (`PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`) and progress (0-100%) |
| `POST` | `/api/tasks/:id/assign` | `ADMIN`, `HR`, `MANAGER` | Reassign or append assignees |
| `GET` | `/api/tasks/:id/comments` | Admin/HR/Manager or Assigned Employee | Fetch chronological comment feed for a task |
| `POST` | `/api/tasks/:id/comments` | Admin/HR/Manager or Assigned Employee | Post discussion comment (author automatically derived from `req.user`) |
| `GET` | `/api/tasks/my` | Everyone | Retrieve tasks assigned to the authenticated user |
| `GET` | `/api/tasks/employee/:id` | `ADMIN`, `HR`, `MANAGER` | View tasks assigned to a specific employee |

#### 4.2 Employees API (Shared Directory)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Everyone | Fetch active employees list from PostgreSQL for assignment dropdowns |
| `GET` | `/api/employees/meta` | Everyone | Retrieve distinct departments and positions for dynamic filtering |

#### 4.3 Notifications API

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Everyone | Get database notifications for authenticated employee (`req.user.employeeId`) |
| `PUT` / `PATCH` | `/api/notifications/:id/read` | Everyone | Mark a notification as read |
| `PUT` / `PATCH` | `/api/notifications/read-all` | Everyone | Mark all notifications as read |

#### 4.4 Task Reports API

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/task-reports` *(or `/api/reports`)* | `ADMIN`, `HR`, `MANAGER` | Aggregate KPI statistics, status breakdown, department metrics, and employee table |
| `GET` | `/api/task-reports/export` *(or `/api/reports/export`)* | `ADMIN`, `HR`, `MANAGER` | Download real-time task analytics as CSV |

#### 4.5 Announcements API

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Everyone | View broadcast announcements |
| `POST` | `/api/announcements` | `ADMIN`, `HR`, `MANAGER` | Publish announcement & notify target employees |
| `DELETE` | `/api/announcements/:id` | `ADMIN`, `HR`, `MANAGER` | Delete announcement |

---

### 5. Backend Mounting Instructions (`app.js`)

Mount the Task Management routers into the central Express application:

```javascript
const taskRoutes = require('./routes/taskRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Mount under standard /api endpoints
app.use('/api/tasks', taskRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/task-reports', reportRoutes); // Aliased for direct compliance
```

---

### 6. Environment Variables Checklist

Ensure these variables are defined in your environment:

```env
# Application Server Configuration
PORT=5000
NODE_ENV=development
API_BASE_URL=http://localhost:5000/api
FRONTEND_URL=http://localhost:5173

# PostgreSQL Database Connection (Prisma ORM)
DATABASE_URL="postgresql://username:password@localhost:5432/thyo_hrms?schema=public"

# Central HRMS JWT Secret & Authentication Bridge
JWT_SECRET="your_secure_jwt_secret_key_from_central_hrms_auth"
JWT_EXPIRES_IN="7d"

# Standalone Dev Adapter Flag (true for local development, false in production)
ENABLE_DEV_AUTH=true
```

---

### 7. Verification Checklist for Integration Testing

Before submitting the combined repository:
- [x] Run `npx prisma generate` to verify schema compatibility.
- [x] Verify database tables (`User`, `Employee`, `Task`, `TaskAssignment`, `TaskComment`, `TaskHistory`, `Notification`, `Announcement`).
- [x] Test `GET /api/tasks` with Admin, Manager, and Employee credentials to verify auto-scoping.
- [x] Test `POST /api/tasks` with an Employee token — verify it returns `403 Forbidden`.
- [x] Test `GET /api/task-reports` with an Employee token — verify it returns `403 Forbidden`.
- [x] Test `GET /api/tasks/:id/comments` and `POST /api/tasks/:id/comments`.
- [x] Test `PUT /api/notifications/:id/read`.
- [x] Ensure no passwords or database credentials are committed to version control.
