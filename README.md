# THYO SOFTECH PVT LTD – HRMS
## Enterprise Task Management Module

[![Technology Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20Prisma%20%7C%20PostgreSQL%20%7C%20React%20%7C%20Vite%20%7C%20Tailwind-blue.svg)](#technology-stack)
[![Status](https://img.shields.io/badge/Status-Complete%20%26%20Production--Ready-success.svg)](#)
[![RBAC](https://img.shields.io/badge/Security-Strict%20Role--Based%20Access%20Control-indigo.svg)](#role-based-access-control-rbac)

A real-life, database-backed **Task Management Module** engineered for **THYO SOFTECH PVT LTD Human Resource Management System (HRMS)**. Designed as a clean, decoupled, and GitHub-ready module ready to be merged into a 5-member team project.

---

## 1. Core Capabilities & Architecture

- **PostgreSQL Database with Prisma ORM**: Relational schema including tasks, task assignments, task history audit trail, task comments, notifications, announcements, and employee records.
- **Strict Role-Based Access Control (RBAC)**:
  - **Admin / HR / Manager**: Full CRUD permissions (create, assign, edit, reassign, delete), view all company tasks, access task reports, and publish announcements.
  - **Employee**: Strictly restricted from creating, editing, reassigning, or deleting tasks. Can only access assigned tasks, update their own progress (0%, 25%, 50%, 75%, 100%), transition task status, add comments, and receive notifications.
- **5 Assignment Strategies**:
  - `INDIVIDUAL`: Assign to a single employee.
  - `MULTIPLE`: Assign to a multi-selected group of employees.
  - `DEPARTMENT`: Automatically assigns to all active employees in a department (e.g. IT, HR, Sales, Operations).
  - `POSITION`: Automatically assigns to all active employees holding a job title (e.g. Software Developer).
  - `ALL`: Automatically assigns to all active staff across THYO SOFTECH PVT LTD.
- **Task Lifecycle & Status Transitions**:
  - `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`
  - `ON_HOLD`, `CANCELLED`, `OVERDUE` (automatic deadline-driven overdue detection).
- **Task Progress**: Incremental milestone updates (0%, 25%, 50%, 75%, 100%).
- **Audit History & Comments**: Chronological log of every status change, milestone, and team comment.
- **Notification System**: Instant alerts on task assignment, overdue deadlines, task completion, and company announcements.
- **Analytics & Reporting**: Real-time KPI summaries, department breakdowns, employee performance tables, and CSV export.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js (v24), Express.js (v4), Prisma ORM (v5), Morgan, CORS, Dotenv |
| **Database** | PostgreSQL (v18), Relational schema with foreign keys and cascade rules |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide React icons, Axios, React Router 6 |
| **Architecture** | Controller-Service-Repository pattern, Strict RBAC middleware, JWT-ready bridge |

---

## 3. Real Development Employee Data

Pre-seeded into PostgreSQL for testing:

| Employee ID | Full Name | Department | Designation | Position | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EMP001** | RUPAM BHARGOV | IT | Senior Software Engineer | Software Developer | ACTIVE |
| **EMP002** | MD TANZIL | HR | HR Executive | HR Executive | ACTIVE |
| **EMP003** | RIYA PRADHAN | Operations | Operations Executive | Operations Executive | ACTIVE |
| **EMP004** | ANSUMAN GOUDA | Sales | Sales Executive | Sales Executive | ACTIVE |
| **EMP005** | SANTOSH SEN | IT | Full Stack Developer | Software Developer | ACTIVE |

> *Note: These temporary development records will be replaced by the team's central User/Employee table during final integration.*

---

## 4. Complete REST API Reference

All routes are prefixed with `/api`. Authenticated identity is passed via Bearer Token or `x-employee-id` / `x-user-role` headers during development.

### 4.1 Tasks API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/tasks` | `ADMIN`, `HR`, `MANAGER` | Create and assign a task | `201 Created` |
| `GET` | `/api/tasks` | Everyone *(auto-scoped for employees)* | List tasks with filters, search, sort, pagination | `200 OK` |
| `GET` | `/api/tasks/:id` | Admin/HR/Manager or Assigned Employee | Get task details, assignments, comments, history | `200 OK` |
| `PUT` | `/api/tasks/:id` | `ADMIN`, `HR`, `MANAGER` | Update general task details | `200 OK` |
| `DELETE` | `/api/tasks/:id` | `ADMIN`, `HR`, `MANAGER` | Delete task and cascade relations | `200 OK` |
| `PATCH` | `/api/tasks/:id/status` | Admin/HR/Manager or Assigned Employee | Update task status and progress percentage | `200 OK` |
| `POST` | `/api/tasks/:id/assign` | `ADMIN`, `HR`, `MANAGER` | Reassign or add new assignees | `200 OK` |
| `GET` | `/api/tasks/my` | Everyone | Get tasks assigned to authenticated employee | `200 OK` |
| `GET` | `/api/tasks/employee/:id` | `ADMIN`, `HR`, `MANAGER` | View tasks assigned to a specific employee | `200 OK` |
| `POST` | `/api/tasks/:id/comments` | Admin/HR/Manager or Assigned Employee | Add discussion comment | `201 Created` |

#### Sample Task Creation Payload (`POST /api/tasks`):
```json
{
  "title": "Prepare Quarterly Financial Forecast",
  "description": "Consolidate regional sales revenue and operational expenses.",
  "category": "Sales",
  "priority": "HIGH",
  "deadline": "2026-09-25",
  "estimatedHours": 14,
  "assignmentType": "DEPARTMENT",
  "targetDepartment": "Sales"
}
```

### 4.2 Reports API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/reports` | `ADMIN`, `HR`, `MANAGER` | Aggregate analytics & employee breakdown | `200 OK` |
| `GET` | `/api/reports/export` | `ADMIN`, `HR`, `MANAGER` | Download CSV analytics report | `200 OK (text/csv)` |

### 4.3 Announcements API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Everyone | View announcements | `200 OK` |
| `POST` | `/api/announcements` | `ADMIN`, `HR`, `MANAGER` | Publish announcement & notify audience | `201 Created` |
| `DELETE` | `/api/announcements/:id` | `ADMIN`, `HR`, `MANAGER` | Delete announcement | `200 OK` |

### 4.4 Notifications API

| Method | Endpoint | Allowed Roles | Description | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Everyone | Get notifications for logged-in user | `200 OK` |
| `PATCH` | `/api/notifications/:id/read` | Everyone | Mark a notification as read | `200 OK` |
| `PATCH` | `/api/notifications/read-all` | Everyone | Mark all notifications as read | `200 OK` |

---

## 5. Quick Start Commands

```powershell
# 1. Backend Setup
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run dev

# 2. Frontend Setup (in a separate terminal)
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173/`

---

## 6. Integration Documentation

Refer to:
- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md): Beginner-friendly setup instructions for Windows.
- [`TEAM_INTEGRATION.md`](./TEAM_INTEGRATION.md): Detailed guide for the 4 teammates to connect authentication, merge database schemas, and apply the RBAC standard.
- [`GIT_WORKFLOW.md`](./GIT_WORKFLOW.md): Git branching and Pull Request guide.
