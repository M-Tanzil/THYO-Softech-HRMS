const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding THYO SOFTECH PVT LTD - HRMS Task Management Module Database...');

  // Clean existing tables (in correct foreign key order)
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.taskComment.deleteMany({});
  await prisma.taskHistory.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});

  console.log('✓ Cleared previous development data');

  // 1. Seed Required Development Employees (8 Employees)
  const employeesData = [
    {
      employeeId: 'EMP001',
      fullName: 'RUPAM BHARGOV',
      email: 'rupam.bhargov@thyosoftech.com',
      phone: '+91 98765 43210',
      department: 'IT',
      designation: 'Senior Software Engineer',
      position: 'Software Developer',
      status: 'ACTIVE',
      joiningDate: new Date('2023-06-15')
    },
    {
      employeeId: 'EMP002',
      fullName: 'MD TANZIL',
      email: 'md.tanzil@thyosoftech.com',
      phone: '+91 98765 43213',
      department: 'HR',
      designation: 'HR Executive',
      position: 'HR Executive',
      status: 'ACTIVE',
      joiningDate: new Date('2023-09-01')
    },
    {
      employeeId: 'EMP003',
      fullName: 'RIYA PRADHAN',
      email: 'riya.pradhan@thyosoftech.com',
      phone: '+91 98765 43212',
      department: 'Sales',
      designation: 'Sales Executive',
      position: 'Sales Executive',
      status: 'ACTIVE',
      joiningDate: new Date('2023-08-10')
    },
    {
      employeeId: 'EMP004',
      fullName: 'ANSUMAN GOUDA',
      email: 'ansuman.gouda@thyosoftech.com',
      phone: '+91 98765 43211',
      department: 'IT',
      designation: 'Software Engineer',
      position: 'Software Developer',
      status: 'ACTIVE',
      joiningDate: new Date('2023-07-01')
    },
    {
      employeeId: 'EMP005',
      fullName: 'SANTOSH SEN',
      email: 'santosh.sen@thyosoftech.com',
      phone: '+91 98765 43214',
      department: 'IT',
      designation: 'Full Stack Developer',
      position: 'Software Developer',
      status: 'ACTIVE',
      joiningDate: new Date('2023-10-05')
    },
    {
      employeeId: 'EMP006',
      fullName: 'PUNIT MISHRA',
      email: 'punit.mishra@thyosoftech.com',
      phone: '+91 98765 43215',
      department: 'Management',
      designation: 'Super Administrator',
      position: 'Head of Engineering / Super Admin',
      status: 'ACTIVE',
      joiningDate: new Date('2023-01-10')
    },
    {
      employeeId: 'EMP009',
      fullName: 'AMIT SHARMA',
      email: 'amit.sharma@thyosoftech.com',
      phone: '+91 98765 43218',
      department: 'Operations',
      designation: 'System Administrator',
      position: 'Administrator',
      status: 'ACTIVE',
      joiningDate: new Date('2023-02-15')
    },
    {
      employeeId: 'EMP007',
      fullName: 'ARJUN MEHTA',
      email: 'arjun.mehta@thyosoftech.com',
      phone: '+91 98765 43216',
      department: 'Sales',
      designation: 'Sales Manager',
      position: 'Manager',
      status: 'ACTIVE',
      joiningDate: new Date('2023-03-15')
    },
    {
      employeeId: 'EMP008',
      fullName: 'NEHA SHARMA',
      email: 'neha.sharma@thyosoftech.com',
      phone: '+91 98765 43217',
      department: 'HR',
      designation: 'HR Lead',
      position: 'HR Manager',
      status: 'ACTIVE',
      joiningDate: new Date('2023-04-01')
    }
  ];

  const seededEmployees = [];
  for (const emp of employeesData) {
    const created = await prisma.employee.create({ data: emp });
    seededEmployees.push(created);
  }
  console.log(`✓ Seeded ${seededEmployees.length} development employees (EMP001 to EMP008)`);

  // 1.5 Seed Real Users with BCRYPT Hashed Passwords
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const managerPassword = await bcrypt.hash('Manager@12345', 10);
  const hrPassword = await bcrypt.hash('Hr@12345', 10);
  const employeePassword = await bcrypt.hash('Employee@12345', 10);

  const usersData = [
    {
      username: 'rupam',
      email: 'rupam.bhargov@thyosoftech.com',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      isActive: true,
      employeeId: 'EMP001'
    },
    {
      username: 'tanzil',
      email: 'md.tanzil@thyosoftech.com',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      isActive: true,
      employeeId: 'EMP002'
    },
    {
      username: 'riya',
      email: 'riya.pradhan@thyosoftech.com',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      isActive: true,
      employeeId: 'EMP003'
    },
    {
      username: 'anshuman',
      email: 'ansuman.gouda@thyosoftech.com',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      isActive: true,
      employeeId: 'EMP004'
    },
    {
      username: 'santosh',
      email: 'santosh.sen@thyosoftech.com',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      isActive: true,
      employeeId: 'EMP005'
    },
    {
      username: 'punit',
      email: 'punit.mishra@thyosoftech.com',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      employeeId: 'EMP006'
    },
    {
      username: 'admin',
      email: 'amit.sharma@thyosoftech.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      employeeId: 'EMP009'
    },
    {
      username: 'arjun',
      email: 'arjun.mehta@thyosoftech.com',
      passwordHash: managerPassword,
      role: 'MANAGER',
      isActive: true,
      employeeId: 'EMP007'
    },
    {
      username: 'neha',
      email: 'neha.sharma@thyosoftech.com',
      passwordHash: hrPassword,
      role: 'HR',
      isActive: true,
      employeeId: 'EMP008'
    }
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }
  console.log(`✓ Seeded ${usersData.length} authenticated users with bcrypt hashed passwords (ADMIN, HR, MANAGER, EMPLOYEE)`);

  // 1.6 Seed Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        employeeId: 'EMP001',
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'SYSTEM',
        entityId: 'SYSTEM',
        details: 'Task management module initialized with secure PostgreSQL database schema and strict RBAC.'
      },
      {
        employeeId: 'EMP001',
        action: 'USER_PROVISIONED',
        entityType: 'USER',
        entityId: 'admin',
        details: 'Administrator account provisioned for IT Department.'
      }
    ]
  });
  console.log('✓ Seeded system audit logs');

  // 2. Seed Realistic Sample Tasks
  const now = new Date();
  const futureDate = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const pastDate = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Task 1: Prepare Monthly Sales Report
  const task1 = await prisma.task.create({
    data: {
      title: 'Prepare Monthly Sales Report',
      description: 'Aggregate regional sales revenue numbers, calculate quarterly targets versus actuals, and generate the final PDF report for executive review.',
      category: 'Sales',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      deadline: futureDate(5),
      estimatedHours: 12,
      assignmentType: 'INDIVIDUAL',
      targetValue: 'EMP004',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP004',
            status: 'IN_PROGRESS',
            progress: 50,
            startedAt: pastDate(2)
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Task created and assigned to EMP004 (ANSUMAN GO)'
          },
          {
            employeeId: 'EMP004',
            action: 'STATUS_UPDATED',
            oldStatus: 'PENDING',
            newStatus: 'IN_PROGRESS',
            description: 'Ansuman Go started working on regional sales aggregation'
          },
          {
            employeeId: 'EMP004',
            action: 'PROGRESS_UPDATED',
            oldStatus: 'IN_PROGRESS',
            newStatus: 'IN_PROGRESS',
            description: 'Progress updated to 50% - North & South zone figures finalized'
          }
        ]
      },
      comments: {
        create: [
          {
            employeeId: 'EMP004',
            authorName: 'ANSUMAN GO',
            comment: 'North zone and South zone numbers are verified. Working on West region data.'
          }
        ]
      }
    }
  });

  // Task 2: Update Company Website
  const task2 = await prisma.task.create({
    data: {
      title: 'Update Company Website',
      description: 'Refresh the homepage hero banner, update service offerings for Q3, and test mobile responsiveness across all major screen sizes.',
      category: 'IT',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      deadline: futureDate(10),
      estimatedHours: 20,
      assignmentType: 'MULTIPLE',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP001',
            status: 'IN_PROGRESS',
            progress: 25,
            startedAt: pastDate(1)
          },
          {
            employeeId: 'EMP005',
            status: 'IN_PROGRESS',
            progress: 25,
            startedAt: pastDate(1)
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Task created and assigned to RUPAM BHARGOV and SANTOSH SEN'
          },
          {
            employeeId: 'EMP001',
            action: 'STATUS_UPDATED',
            oldStatus: 'PENDING',
            newStatus: 'IN_PROGRESS',
            description: 'Development environment prepared, banner assets updated.'
          }
        ]
      },
      comments: {
        create: [
          {
            employeeId: 'EMP005',
            authorName: 'SANTOSH SEN',
            comment: 'New responsive navigation components are ready for PR.'
          }
        ]
      }
    }
  });

  // Task 3: Prepare Employee Documentation
  const task3 = await prisma.task.create({
    data: {
      title: 'Prepare Employee Documentation',
      description: 'Audit employee personnel files, verify Aadhaar/PAN compliance documents, and update the HRMS digital locker archive.',
      category: 'HR',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      deadline: pastDate(1),
      estimatedHours: 8,
      assignmentType: 'INDIVIDUAL',
      targetValue: 'EMP002',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP002',
            status: 'COMPLETED',
            progress: 100,
            startedAt: pastDate(4),
            completedAt: pastDate(1)
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Task assigned to MD TANZIL'
          },
          {
            employeeId: 'EMP002',
            action: 'STATUS_UPDATED',
            oldStatus: 'IN_PROGRESS',
            newStatus: 'COMPLETED',
            description: 'All 5 employee verification packets verified and archived'
          }
        ]
      },
      comments: {
        create: [
          {
            employeeId: 'EMP002',
            authorName: 'MD TANZIL',
            comment: 'Documentation successfully verified for all department employees.'
          }
        ]
      }
    }
  });

  // Task 4: Complete Client Requirement Analysis
  const task4 = await prisma.task.create({
    data: {
      title: 'Complete Client Requirement Analysis',
      description: 'Review technical specifications for the upcoming ERP migration client project, estimate sprint story points, and prepare the architectural diagram.',
      category: 'IT',
      priority: 'URGENT',
      status: 'PENDING',
      deadline: futureDate(3),
      estimatedHours: 16,
      assignmentType: 'POSITION',
      targetValue: 'Software Developer',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP001',
            status: 'PENDING',
            progress: 0
          },
          {
            employeeId: 'EMP005',
            status: 'PENDING',
            progress: 0
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Task assigned to all Software Developers (EMP001, EMP005)'
          }
        ]
      }
    }
  });

  // Task 5: Prepare HR Monthly Report
  const task5 = await prisma.task.create({
    data: {
      title: 'Prepare HR Monthly Report',
      description: 'Compile monthly headcount, joiners, attrition rates, and leave balance summary for the leadership meeting.',
      category: 'HR',
      priority: 'HIGH',
      status: 'PENDING',
      deadline: futureDate(7),
      estimatedHours: 6,
      assignmentType: 'DEPARTMENT',
      targetValue: 'HR',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP002',
            status: 'PENDING',
            progress: 0
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Assigned to HR Department'
          }
        ]
      }
    }
  });

  // Task 6: Operations Asset & Inventory Audit
  const task6 = await prisma.task.create({
    data: {
      title: 'Office Inventory & Asset Audit',
      description: 'Physical verification of office laptops, monitors, access cards, and ergonomic equipment across the Bangalore campus.',
      category: 'Operations',
      priority: 'LOW',
      status: 'ON_HOLD',
      deadline: futureDate(14),
      estimatedHours: 15,
      assignmentType: 'INDIVIDUAL',
      targetValue: 'EMP003',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP003',
            status: 'ON_HOLD',
            progress: 25,
            startedAt: pastDate(5)
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Assigned to RIYA PRADHAN'
          },
          {
            employeeId: 'EMP003',
            action: 'STATUS_UPDATED',
            oldStatus: 'IN_PROGRESS',
            newStatus: 'ON_HOLD',
            description: 'Audit paused pending vendor delivery of updated asset barcode stickers.'
          }
        ]
      },
      comments: {
        create: [
          {
            employeeId: 'EMP003',
            authorName: 'RIYA PRADHAN',
            comment: 'Stickers arriving on Monday; will resume asset scanning immediately after.'
          }
        ]
      }
    }
  });

  // Task 7: Overdue Task for Testing
  const task7 = await prisma.task.create({
    data: {
      title: 'Q3 Product Architecture Review',
      description: 'Review microservices decoupling plan, benchmark database query latencies, and submit performance optimization recommendations.',
      category: 'IT',
      priority: 'URGENT',
      status: 'OVERDUE',
      deadline: pastDate(2),
      estimatedHours: 10,
      assignmentType: 'INDIVIDUAL',
      targetValue: 'EMP001',
      createdBy: 'EMP001',
      assignments: {
        create: [
          {
            employeeId: 'EMP001',
            status: 'OVERDUE',
            progress: 25,
            startedAt: pastDate(6)
          }
        ]
      },
      history: {
        create: [
          {
            employeeId: 'EMP001',
            action: 'TASK_CREATED',
            oldStatus: null,
            newStatus: 'PENDING',
            description: 'Task created'
          },
          {
            employeeId: 'EMP001',
            action: 'STATUS_UPDATED',
            oldStatus: 'IN_PROGRESS',
            newStatus: 'OVERDUE',
            description: 'Deadline passed on ' + pastDate(2).toLocaleDateString()
          }
        ]
      }
    }
  });

  console.log('✓ Seeded 7 realistic tasks with assignments, history logs, and comments');

  // 3. Seed Announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Welcome to THYO SOFTECH PVT LTD Task Management System',
        message: 'The new Task Management Module is now live! Employees can view assigned tasks, update real-time progress, log comments, and receive instant system notifications.',
        audience: 'ALL',
        publishDate: pastDate(3),
        createdById: 'EMP001'
      },
      {
        title: 'Quarterly Sprint Goals & Technical Milestones',
        message: 'All software engineering team members are requested to review high-priority tasks and ensure story points are finalized by this Friday.',
        audience: 'DEPARTMENT',
        targetValue: 'IT',
        publishDate: pastDate(1),
        createdById: 'EMP001'
      }
    ]
  });
  console.log('✓ Seeded company announcements');

  // 4. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        recipientId: 'EMP001',
        title: 'Task Overdue Alert',
        message: 'Your task "Q3 Product Architecture Review" is past its deadline.',
        type: 'TASK_OVERDUE',
        link: `/tasks/${task7.id}`,
        isRead: false
      },
      {
        recipientId: 'EMP001',
        title: 'New Task Assigned',
        message: 'You have been assigned to "Complete Client Requirement Analysis".',
        type: 'TASK_ASSIGNED',
        link: `/tasks/${task4.id}`,
        isRead: false
      },
      {
        recipientId: 'EMP004',
        title: 'New Task Assigned',
        message: 'You have been assigned to "Prepare Monthly Sales Report".',
        type: 'TASK_ASSIGNED',
        link: `/tasks/${task1.id}`,
        isRead: true
      },
      {
        recipientId: 'EMP002',
        title: 'Task Completed',
        message: 'Your task "Prepare Employee Documentation" has been verified as COMPLETED.',
        type: 'TASK_COMPLETED',
        link: `/tasks/${task3.id}`,
        isRead: true
      },
      {
        recipientId: 'EMP003',
        title: 'Task On Hold',
        message: 'Task "Office Inventory & Asset Audit" was updated to ON_HOLD.',
        type: 'INFO',
        link: `/tasks/${task6.id}`,
        isRead: false
      }
    ]
  });
  console.log('✓ Seeded employee notifications');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
