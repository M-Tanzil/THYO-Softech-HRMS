# THYO SOFTECH PVT LTD – HRMS
## Enterprise Task Management Module

[![Technology Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20Prisma%20%7C%20PostgreSQL%20%7C%20React%20%7C%20Vite%20%7C%20Tailwind-blue.svg)](#technology-stack)
[![Status](https://img.shields.io/badge/Status-Production--Ready%20%26%20Integration--Ready-success.svg)](#)
[![RBAC](https://img.shields.io/badge/Security-Strict%20Role--Based%20Access%20Control-indigo.svg)](#role-based-access-control-rbac)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Persistent)-blue.svg)](#database-architecture)

A real-life, database-backed **Task Management Module** engineered for the **THYO SOFTECH PVT LTD Human Resource Management System (HRMS)**. Designed as a clean, decoupled, and GitHub-ready module ready to be integrated into a 5-member team project alongside Attendance, Payroll, Leave Management, and Central Authentication.

---

## 1. Core Architecture & Capabilities

- **PostgreSQL Database with Prisma ORM**: Persistent relational schema with foreign key integrity.
  - **Shared Central HRMS Tables**: `User`, `Employee`, `AuditLog` (designed to be shared across Attendance, Payroll, Leaves).
  - **Task Management Specific Tables**: `Task`, `TaskAssignment`, `TaskComment`, `TaskHistory`, `Notification`, `Announcement`.
- **Central HRMS Authentication Integration**:
  - Consumes centralized HRMS identity (`req.user.id`, `req.user.employeeId`, `req.user.name`, `req.user.role`).
  - No separate Task Management login or registration page.
  - Clean development authentication adapter (`devAuthAdapter`) for standalone local testing before central auth is plugged in.
- **Strict Role-Based Access Control (RBAC)** (Enforced on Express Backend):
  - **Super Admin**: Full system and task administration authority across THYO SOFTECH PVT LTD. Create, assign, update, and permanently delete tasks, manage assignments, view organization-wide analytics reports, and monitor company-wide task progress.
  - **Admin**: Full task-management authority within organization's permitted scope — create tasks, assign tasks, update tasks, permanently delete tasks, view company-wide task reports, and monitor progress.
  - **Manager**: View and manage authorized team tasks within their department, assign strictly within department, monitor assigned team members, update permitted task information. Strictly blocked by backend from deleting tasks or assigning organization-wide.
  - **Employee**: View only authorized deliverables assigned to them, update own progress (0%, 25%, 50%, 75%, 100%), transition task status, add discussion comments. Strictly blocked by backend from creating, editing, or deleting tasks.
- **5 Dynamic Assignment Strategies**:
  - `INDIVIDUAL`: Assign to a single employee.
  - `MULTIPLE`: Assign to a multi-selected group of employees.
  - `DEPARTMENT`: Automatically assigns to all active employees in a department (e.g. IT, HR, Sales, Operations).
  - `POSITION`: Automatically assigns to all active employees holding a job title (e.g. Software Developer).
  - `ALL`: Automatically assigns to all active staff across THYO SOFTECH PVT LTD.
- **Task Lifecycle & Status Transitions**:
  - `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`
  - `ON_HOLD`, `CANCELLED`, `OVERDUE` (automatic deadline-driven overdue detection).
- **Audit History & Discussion**: Chronological log of every status change, progress milestone, and team comment.
- **Persistent Notifications**: Database-backed alerts on assignment, overdue status, completion, and announcements.
- **Analytics & Reporting**: Real-time KPI summaries, status breakdown, department metrics, and CSV export.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js (v24), Express.js (v4), Prisma ORM (v5), Morgan, CORS, Dotenv, JWT |
| **Database** | PostgreSQL, Relational schema with foreign keys, cascade deletes, and indexing |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide React icons, Axios, React Router 6 |
| **Architecture** | Controller-Service-Repository pattern, Strict RBAC middleware, JWT Bridge |

---

## 3. Database Architecture & Shared Tables

```
                    ┌────────────────────────────────────────┐
                    │          SHARED HRMS CORE              │
                    │  ┌──────────────┐    ┌──────────────┐  │
                    │  │     User     │───▶│   Employee   │  │
                    │  └──────────────┘    └──────────────┘  │
                    │         │                    │         │
                    └─────────┼────────────────────┼─────────┘
                              │                    │
              ┌───────────────┼────────────────────┼────────────────┐
              │               ▼                    ▼                │
              │     TASK MANAGEMENT MODULE SPECIFIC TABLES          │
              │                                                     │
              │   ┌──────────────────┐       ┌──────────────────┐   │
              │   │       Task       │◀─────▶│  TaskAssignment  │   │
              │   └──────────────────┘       └──────────────────┘   │
              │            │                           │            │
              │            ▼                           ▼            │
              │   ┌──────────────────┐       ┌──────────────────┐   │
              │   │   TaskHistory    │       │   TaskComment    │   │
              │   └──────────────────┘       └──────────────────┘   │
              │                                                     │
              │   ┌──────────────────┐       ┌──────────────────┐   │
              │   │   Notification   │       │   Announcement   │   │
              │   └──────────────────┘       └──────────────────┘   │
              └─────────────────────────────────────────────────────┘
```

---

## 4. Complete REST API Reference

All endpoints are hosted under `/api`.

### 4.1 Tasks API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Everyone *(auto-scoped for employees)* | List tasks with filters, search, sort, pagination | `200 OK` |
| `POST` | `/api/tasks` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Create and assign a task | `201 Created` |
| `GET` | `/api/tasks/:id` | Super Admin / Admin / Manager or Assigned Employee | Get task details, assignments, comments, history | `200 OK` |
| `PUT` | `/api/tasks/:id` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Update general task details | `200 OK` |
| `DELETE` | `/api/tasks/:id` | `SUPER_ADMIN`, `ADMIN` | Permanently delete task and cascade relations | `200 OK` |
| `PATCH` | `/api/tasks/:id/status` | Super Admin / Admin / Manager or Assigned Employee | Update task status and progress percentage | `200 OK` |
| `POST` | `/api/tasks/:id/assign` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Reassign or add new assignees | `200 OK` |
| `GET` | `/api/tasks/:id/comments` | Super Admin / Admin / Manager or Assigned Employee | Retrieve chronological comments for a task | `200 OK` |
| `POST` | `/api/tasks/:id/comments` | Super Admin / Admin / Manager or Assigned Employee | Add discussion comment | `201 Created` |
| `GET` | `/api/tasks/my` | Everyone | Get tasks assigned to authenticated employee | `200 OK` |
| `GET` | `/api/tasks/employee/:id` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | View tasks assigned to a specific employee | `200 OK` |

### 4.2 Employees API (Shared Directory)

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Everyone | Get all active employees from PostgreSQL | `200 OK` |
| `GET` | `/api/employees/meta` | Everyone | Get distinct departments and positions metadata | `200 OK` |

### 4.3 Task Reports API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/task-reports` *(or `/api/reports`)* | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Aggregate KPI metrics & employee breakdown | `200 OK` |
| `GET` | `/api/task-reports/export` *(or `/api/reports/export`)* | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Download CSV analytics report | `200 OK (text/csv)` |

### 4.4 Notifications API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Everyone | Get database notifications for logged-in user | `200 OK` |
| `PUT` / `PATCH` | `/api/notifications/:id/read` | Everyone | Mark a notification as read | `200 OK` |
| `PUT` / `PATCH` | `/api/notifications/read-all` | Everyone | Mark all notifications as read | `200 OK` |

### 4.5 Announcements API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Everyone | View announcements | `200 OK` |
| `POST` | `/api/announcements` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Publish announcement & notify audience | `201 Created` |
| `DELETE` | `/api/announcements/:id` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | Delete announcement | `200 OK` |

---

## 5. Quick Start Commands

```powershell
# 1. Backend Setup
cd backend
npm install
npx prisma generate
node src/server.js

# 2. Frontend Setup (in a separate terminal)
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173/`

---

## 6. Integration Documentation

Refer to:
- [`TEAM_INTEGRATION.md`](./TEAM_INTEGRATION.md): Detailed guide for teammates to connect Central HRMS Auth, merge database schemas, and align RBAC rules.
- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md): Step-by-step setup instructions for Windows.
- [`GIT_WORKFLOW.md`](./GIT_WORKFLOW.md): Git branching and Pull Request guide.
