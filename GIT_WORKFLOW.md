# THYO SOFTECH PVT LTD – HRMS
## Git Workflow & GitHub Collaboration Guide

This document outlines the standard Git workflow for the 5-member team working on **THYO SOFTECH PVT LTD HRMS**.

> **Golden Rule for Team Collaboration:**
> Never push code directly to the `main` branch. Always work on your designated feature branch and create a **Pull Request (PR)** for review before merging.

---

### 1. Step-by-Step Git Workflow for Student 5 (Task Management)

#### Step 1: Check Current Status
Open PowerShell in your project folder:
```powershell
cd "C:\Users\RUPAM BHARGOV\thyo-hrms-task-management"
git status
```

#### Step 2: Initialize Git (if not already initialized)
```powershell
git init
```

#### Step 3: Create and Switch to Your Feature Branch
```powershell
git checkout -b student-5-task-management
```
*(You are now working safely on your isolated branch without affecting `main` or your teammates).*

#### Step 4: Stage All Files
```powershell
git add .
```
Verify what is staged:
```powershell
git status
```
*(Notice that `node_modules`, `.env`, and `dist` are automatically excluded by `.gitignore`).*

#### Step 5: Commit Your Work with a Clear Message
```powershell
git commit -m "feat(tasks): implement enterprise task management module with strict RBAC"
```

#### Step 6: Link to Remote GitHub Repository
```powershell
git remote add origin https://github.com/<YOUR_ORGANIZATION_OR_USERNAME>/thyo-softech-hrms.git
```
*(Replace `<YOUR_ORGANIZATION_OR_USERNAME>` with your team's repository URL).*

#### Step 7: Push Branch to GitHub
```powershell
git push -u origin student-5-task-management
```

---

### 2. Creating a Pull Request (PR) on GitHub

1. Open your team's repository on [https://github.com/](https://github.com/).
2. You will see a banner:
   **`student-5-task-management had recent pushes 1 minute ago`**
3. Click the green button: **"Compare & pull request"**.
4. Fill in the PR details:
   - **Title**: `feat: Task Management Section with Strict RBAC, Notifications, and Reports`
   - **Description**:
     ```markdown
     ### Module Summary
     - Complete Task Management module for THYO SOFTECH PVT LTD HRMS.
     - Implemented backend REST APIs with Node.js, Express.js, PostgreSQL, and Prisma ORM.
     - Implemented React + Vite frontend with Tailwind CSS and Lucide icons.
     - Enforced strict RBAC: Admin/HR/Manager can create/assign/edit/delete; Employees can only view assigned tasks and update progress.
     - Automated overdue detection, task comments, and history audit trail.
     - Real-time notification system and company announcements feed.
     - Comprehensive Task Analytics with CSV export.

     ### Verification
     - Backend endpoints tested & verified (403 on unauthorized access, 201 on authorized creation).
     - Frontend production bundle verified with 0 errors (`npm run build`).
     ```
5. Assign your 4 teammates as **Reviewers**.
6. Once reviewed, click **"Merge pull request"**.

---

### 3. Syncing Teammates' Changes in the Future

When other team members merge their modules (Auth, Employee Management, Payroll, Attendance), sync your local repository:

```powershell
# 1. Switch to main branch
git checkout main

# 2. Pull the latest code merged by teammates
git pull origin main

# 3. Switch back to your working branch
git checkout student-5-task-management

# 4. Merge main updates into your branch
git merge main
```
