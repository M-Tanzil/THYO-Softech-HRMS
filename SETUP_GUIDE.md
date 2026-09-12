# THYO SOFTECH PVT LTD – HRMS
## Task Management Module: Complete Setup Guide (Windows)

This guide provides step-by-step instructions designed for beginners to set up, configure, migrate, seed, and run the **Task Management Module** for **THYO SOFTECH PVT LTD HRMS** on Windows.

---

### 1. Prerequisites & Required Software

Ensure you have the following installed on your Windows computer:
1. **Node.js** (v18.x or higher recommended; v20/v24 verified)
   - Download from: [https://nodejs.org/](https://nodejs.org/)
   - Verify in PowerShell: `node -v` and `npm -v`
2. **PostgreSQL** (v15, v16, v17, or v18)
   - Download from: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Standard Port: `5432`
3. **Git for Windows**
   - Download from: [https://git-scm.com/download/win](https://git-scm.com/download/win)
4. **Visual Studio Code (VS Code)**
   - Download from: [https://code.visualstudio.com/](https://code.visualstudio.com/)

---

### 2. Project Directory Structure

The project is cleanly structured into two independent directories:
- `backend/`: Node.js, Express.js, Prisma ORM, PostgreSQL database logic & REST APIs
- `frontend/`: React, Vite, Tailwind CSS, Lucide icons, React Router

```text
thyo-hrms-task-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema definition
│   │   └── seed.js             # Seed script (EMP001 - EMP005 + sample tasks)
│   ├── src/
│   │   ├── config/prisma.js    # Prisma database connection
│   │   ├── controllers/        # Task, Notification, Announcement, Report, Employee controllers
│   │   ├── middleware/         # RBAC authentication, validation, error handler
│   │   ├── routes/             # REST route declarations
│   │   ├── services/           # Core business logic, assignment resolution, overdue calculation
│   │   ├── app.js              # Express application setup
│   │   └── server.js           # Server entry point (Port 5000)
│   ├── .env                    # Active environment variables
│   ├── .env.example            # Environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js       # Axios HTTP client with RBAC headers
│   │   ├── components/         # Reusable Task, Notification, Announcement UI components
│   │   ├── context/AuthContext # Simulation switcher (Admin, HR, Manager, Employee)
│   │   ├── pages/              # Admin and Employee views
│   │   ├── App.jsx             # React Router with ProtectedRoute guards
│   │   └── main.jsx
│   ├── .env                    # Frontend environment
│   ├── tailwind.config.js
│   └── package.json
│
├── README.md                   # Full module documentation & API reference
├── TEAM_INTEGRATION.md         # Instructions for the 4 teammates to merge into main HRMS
├── GIT_WORKFLOW.md             # Git branch and pull request guide
└── SETUP_GUIDE.md              # This setup file
```

---

### 3. Step-by-Step Setup Instructions

#### Step 3.1: Clone or Open Project in VS Code
Open PowerShell and navigate to the project directory:
```powershell
cd "C:\Users\RUPAM BHARGOV\thyo-hrms-task-management"
code .
```

#### Step 3.2: Configure PostgreSQL Database
1. Open PowerShell or `psql` and create the dedicated database:
   ```powershell
   "CREATE DATABASE thyo_task_db;" | & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432
   ```
2. Verify database connection string in `backend/.env`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thyo_task_db?schema=public"
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   ```
   *(Replace `postgres:postgres` with your local PostgreSQL username and password if different).*

#### Step 3.3: Install Backend Dependencies & Migrate Database
Open a PowerShell terminal for the **Backend**:
```powershell
# Navigate into backend folder
cd "C:\Users\RUPAM BHARGOV\thyo-hrms-task-management\backend"

# 1. Install dependencies
npm install

# 2. Generate Prisma client & create tables
npx prisma generate
npx prisma db push

# 3. Seed initial development employees & realistic tasks
node prisma/seed.js
```

You will see:
```text
🌱 Seeding THYO SOFTECH PVT LTD - HRMS Task Management Module Database...
✓ Cleared previous development data
✓ Seeded 5 development employees (EMP001 to EMP005)
✓ Seeded 7 realistic tasks with assignments, history logs, and comments
✓ Seeded company announcements
✓ Seeded employee notifications
🎉 Database seeding completed successfully!
```

#### Step 3.4: Install Frontend Dependencies
Open a second PowerShell terminal for the **Frontend**:
```powershell
# Navigate into frontend folder
cd "C:\Users\RUPAM BHARGOV\thyo-hrms-task-management\frontend"

# 1. Install dependencies
npm install

# 2. Verify build
npm run build
```

---

### 4. Running the Application

You need two active terminals running:

#### Terminal 1: Start Backend Server
```powershell
cd "C:\Users\RUPAM BHARGOV\thyo-hrms-task-management\backend"
npm run dev
```
Output:
```text
🏢 THYO SOFTECH PVT LTD - HRMS TASK MANAGEMENT SYSTEM
✓ Connected to PostgreSQL Database via Prisma
✓ Server running at http://localhost:5000
✓ Health Check: http://localhost:5000/api/health
```

#### Terminal 2: Start Frontend Application
```powershell
cd "C:\Users\RUPAM BHARGOV\thyo-hrms-task-management\frontend"
npm run dev
```
Output:
```text
  VITE v5.4.21  ready in 450 ms

  ➜  Local:   http://localhost:5173/
```

Open your browser and navigate to: **`http://localhost:5173/`**

---

### 5. Testing the Role-Based Workflow in the UI

At the top right of the application header, you will find the **User & Role Simulator**:
1. **Testing Administrative Workflow**:
   - Select User: `EMP001 - RUPAM BHARGOV`
   - Select Role: `ADMIN`
   - You have access to: **All Tasks**, **Create Task**, **Task Reports**, **Announcements**.
   - Click **Create Task**, choose Assignment Type: `Department` -> `IT` or `Multiple Employees`, set priority and deadline, and submit.
   - Observe that the task is created in PostgreSQL, assignments are generated, and notifications are sent.
2. **Testing Employee Workflow (Strict RBAC)**:
   - Select User: `EMP003 - RIYA PRADHAN` or `EMP004 - ANSUMAN GOUDA`
   - Select Role: `EMPLOYEE`
   - Notice that **Task Administration** (Create Task, All Tasks, Reports) is completely hidden.
   - The employee sees **My Assigned Tasks**, **Notifications**, and **Announcements**.
   - Open an assigned task -> Click **START TASK** -> Click **50%** milestone -> Add a comment.
   - Observe that the status and history update in real-time in PostgreSQL!
   - Try manually entering `http://localhost:5173/tasks/create` in your browser URL bar: The frontend **ProtectedRoute** blocks access and displays **Access Restricted**.
