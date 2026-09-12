# THYO SOFTECH PVT LTD – HRMS
## Team Integration Guide: Task Management Module

> **Attention Team Members (Teammates 1, 2, 3, and 4):**
> 
> This document provides complete instructions for integrating the **Task Management Section** into the central **THYO SOFTECH PVT LTD HRMS** monolith.
> 
> **Important Note on Development Data:**
> Temporary development employee records (`EMP001` - `EMP005`) in the `Employee` table were used for standalone development and testing. During final integration, replace these references with the team's central `User` and `Employee` tables.

---

### 1. Module File Inventory

When integrating this module into the main HRMS repository, the following files and folders belong to the Task Management section:

#### Backend Files:
- `backend/prisma/schema.prisma` (Models: `Task`, `TaskAssignment`, `TaskComment`, `TaskHistory`, `Notification`, `Announcement`)
- `backend/src/controllers/taskController.js`
- `backend/src/controllers/notificationController.js`
- `backend/src/controllers/announcementController.js`
- `backend/src/controllers/reportController.js`
- `backend/src/services/taskService.js`
- `backend/src/services/notificationService.js`
- `backend/src/services/announcementService.js`
- `backend/src/services/reportService.js`
- `backend/src/routes/taskRoutes.js`
- `backend/src/routes/notificationRoutes.js`
- `backend/src/routes/announcementRoutes.js`
- `backend/src/routes/reportRoutes.js`
- `backend/src/middleware/authMiddleware.js` (Role-based access guard & JWT bridge)
- `backend/src/middleware/validation.js` (Validation schemas)

#### Frontend Files:
- `frontend/src/components/tasks/` (`TaskCard`, `TaskForm`, `TaskTable`, `TaskFilters`)
- `frontend/src/components/notifications/` (`NotificationBell`)
- `frontend/src/components/announcements/` (`AnnouncementCard`, `AnnouncementModal`)
- `frontend/src/components/common/` (`StatusBadge`, `PriorityBadge`, `ProgressBar`, `Modal`, `ProtectedRoute`)
- `frontend/src/pages/admin/` (`TaskListPage`, `CreateTaskPage`, `TaskDetailPage`, `EditTaskPage`, `TaskReportsPage`)
- `frontend/src/pages/employee/` (`MyTasksPage`, `EmployeeTaskDetailPage`)
- `frontend/src/pages/NotificationsPage.jsx`
- `frontend/src/pages/AnnouncementsPage.jsx`

---

### 2. Database Integration & Schema Merging

Copy the following models into your central `prisma/schema.prisma`:

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
  id             String         @id @default(uuid())
  title          String
  description    String         @db.Text
  category       String         @default("General")
  priority       Priority       @default(MEDIUM)
  status         TaskStatus     @default(PENDING)
  deadline       DateTime
  estimatedHours Float          @default(0)
  assignmentType AssignmentType @default(INDIVIDUAL)
  targetValue    String?
  attachmentUrl  String?
  tags           String?
  createdBy      String         // References User.employeeId or User.id
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  assignments TaskAssignment[]
  comments    TaskComment[]
  history     TaskHistory[]

  @@index([priority])
  @@index([status])
  @@index([deadline])
  @@index([createdBy])
}

model TaskAssignment {
  id          String     @id @default(uuid())
  taskId      String
  employeeId  String     // Foreign key referencing your central Employee table
  status      TaskStatus @default(PENDING)
  progress    Int        @default(0) // 0, 25, 50, 75, 100
  assignedAt  DateTime   @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  updatedAt   DateTime   @updatedAt

  task     Task          @relation(fields: [taskId], references: [id], onDelete: Cascade)
  employee Employee      @relation(fields: [employeeId], references: [employeeCode], onDelete: Cascade)
  comments TaskComment[]

  @@unique([taskId, employeeId])
  @@index([employeeId])
  @@index([status])
}

model TaskHistory {
  id          String      @id @default(uuid())
  taskId      String
  employeeId  String?
  action      String      // TASK_CREATED, STATUS_UPDATED, PROGRESS_UPDATED, TASK_REASSIGNED
  oldStatus   TaskStatus?
  newStatus   TaskStatus?
  description String
  createdAt   DateTime    @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([createdAt])
}

model TaskComment {
  id               String   @id @default(uuid())
  taskId           String
  taskAssignmentId String?
  employeeId       String
  authorName       String
  comment          String   @db.Text
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  task       Task            @relation(fields: [taskId], references: [id], onDelete: Cascade)
  assignment TaskAssignment? @relation(fields: [taskAssignmentId], references: [id], onDelete: SetNull)

  @@index([taskId])
  @@index([employeeId])
}

model Notification {
  id          String   @id @default(uuid())
  recipientId String   // References Employee.employeeCode or User.id
  title       String
  message     String   @db.Text
  type        String   @default("INFO")
  link        String?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

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
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([audience])
  @@index([publishDate])
}
```

After updating `schema.prisma`, execute:
```bash
npx prisma migrate dev --name add_task_management_module
```

---

### 3. Connecting Authentication (Teammate 1: Auth Module)

In `backend/src/middleware/authMiddleware.js`, replace the development header extraction with your JWT verification:

```javascript
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Look up user in central database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      include: { employee: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account.' });
    }

    req.user = {
      id: user.id,
      employeeId: user.employee?.employeeCode || user.employeeId,
      fullName: user.employee?.fullName || user.email,
      email: user.email,
      department: user.employee?.department?.name || user.employee?.department || 'General',
      designation: user.employee?.designation?.title || user.employee?.position || 'Staff',
      position: user.employee?.jobPosition || user.employee?.position || 'Staff',
      role: user.role // 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid token.' });
  }
}
```

---

### 4. Mounting Routes into Main HRMS Backend (`app.js`)

In your main backend `app.js` or `server.js`, mount the routes:

```javascript
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Mount under standard /api endpoints
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
```

---

### 5. Frontend Navigation Integration (`Sidebar.jsx` & Main Router)

In your main HRMS layout sidebar:

```jsx
{/* For Admin / HR / Manager */}
{['ADMIN', 'HR', 'MANAGER'].includes(userRole) && (
  <>
    <NavLink to="/tasks">Task Board</NavLink>
    <NavLink to="/tasks/create">Create Task</NavLink>
    <NavLink to="/tasks/reports">Task Reports</NavLink>
  </>
)}

{/* For All Employees */}
<NavLink to="/my-tasks">My Tasks</NavLink>
<NavLink to="/notifications">Notifications</NavLink>
<NavLink to="/announcements">Announcements</NavLink>
```

Add the routes to your main `App.jsx` router:
```jsx
<Route path="/tasks" element={<ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}><TaskListPage /></ProtectedRoute>} />
<Route path="/tasks/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}><CreateTaskPage /></ProtectedRoute>} />
<Route path="/tasks/:id" element={<TaskDetailPage />} />
<Route path="/tasks/:id/edit" element={<ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}><EditTaskPage /></ProtectedRoute>} />
<Route path="/tasks/reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}><TaskReportsPage /></ProtectedRoute>} />
<Route path="/my-tasks" element={<MyTasksPage />} />
<Route path="/my-tasks/:id" element={<EmployeeTaskDetailPage />} />
<Route path="/notifications" element={<NotificationsPage />} />
<Route path="/announcements" element={<AnnouncementsPage />} />
```

---

### 6. Universal HRMS Role-Based Access Control (RBAC) Standard

Apply this identical permission matrix across every module of the HRMS:

| Action / Module | ADMIN | HR | MANAGER | EMPLOYEE |
| :--- | :---: | :---: | :---: | :---: |
| **Task Management: Create, Assign, Edit, Reassign, Delete** | ✅ | ✅ | ✅ | ❌ (Strictly blocked in API & UI) |
| **Task Reports & Export CSV** | ✅ | ✅ | ✅ | ❌ (403 Forbidden) |
| **View Assigned Tasks & Update Progress (0%-100%)** | ✅ | ✅ | ✅ | ✅ (Own assigned tasks only) |
| **Attendance: Clock-in / Out, View Own Attendance** | ✅ | ✅ | ✅ | ✅ |
| **Attendance: Approve Corrections / Regularize** | ✅ | ✅ | ✅ | ❌ |
| **Leaves: Request Leave, View Own Balances** | ✅ | ✅ | ✅ | ✅ |
| **Leaves: Approve / Reject Leaves** | ✅ | ✅ | ✅ | ❌ |
| **Payroll: Run Payroll, Configure Salary** | ✅ | ✅ | ❌ | ❌ |
| **Payslip: View & Download Own Payslip** | ✅ | ✅ | ✅ | ✅ |

---

### 7. Environment Variables Checklist

Ensure these variables exist in your production/staging `.env`:

```env
# Port & Origin
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/thyo_hrms?schema=public"

# JWT Secret (for authentication module integration)
JWT_SECRET="your_secure_jwt_secret_key"
```
