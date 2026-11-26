const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('🔄 Safely syncing required real users to PostgreSQL...');

  // 1. Ensure SUPER_ADMIN exists in PostgreSQL enum "Role"
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
    console.log('✓ Verified PostgreSQL enum "Role" includes SUPER_ADMIN');
  } catch (err) {
    console.log('ℹ Note on enum Role:', err.message);
  }

  // Pre-hashed default password for development authentication
  const defaultPasswordHash = await bcrypt.hash('Thyo@12345', 10);

  // Define the target employees and users specified in the prompt:
  // EMPLOYEES:
  // 1. EMP001 - RUPAM BHARGOV (EMPLOYEE)
  // 2. EMP002 - ANSHUMAN GOUDA (EMPLOYEE)
  // 3. EMP003 - RIYA PRADHAN (EMPLOYEE)
  // 4. EMP004 - MD TANZIL (EMPLOYEE)
  // 5. EMP005 - SANTOSH SEN (EMPLOYEE)
  // OTHER SYSTEM USERS:
  // 6. PUNIT MISHRA - SUPER ADMIN (EMP006)
  // 7. AMIT SHARMA - ADMIN (EMP009)
  // 8. ARJUN MEHTA - MANAGER (EMP007)
  // 9. NEHA SHARMA - MANAGER (EMP008)
  const targetRecords = [
    {
      employeeId: 'EMP001',
      fullName: 'RUPAM BHARGOV',
      email: 'rupam.bhargov@thyosoftech.com',
      department: 'IT',
      designation: 'Senior Software Engineer',
      position: 'Software Developer',
      role: 'EMPLOYEE',
      username: 'rupam'
    },
    {
      employeeId: 'EMP002',
      fullName: 'MD TANZIL',
      email: 'md.tanzil@thyosoftech.com',
      department: 'HR',
      designation: 'HR Executive',
      position: 'HR Executive',
      role: 'EMPLOYEE',
      username: 'tanzil'
    },
    {
      employeeId: 'EMP003',
      fullName: 'RIYA PRADHAN',
      email: 'riya.pradhan@thyosoftech.com',
      department: 'Sales',
      designation: 'Sales Executive',
      position: 'Sales Executive',
      role: 'EMPLOYEE',
      username: 'riya'
    },
    {
      employeeId: 'EMP004',
      fullName: 'ANSUMAN GOUDA',
      email: 'ansuman.gouda@thyosoftech.com',
      department: 'IT',
      designation: 'Software Engineer',
      position: 'Software Developer',
      role: 'EMPLOYEE',
      username: 'anshuman'
    },
    {
      employeeId: 'EMP005',
      fullName: 'SANTOSH SEN',
      email: 'santosh.sen@thyosoftech.com',
      department: 'IT',
      designation: 'Full Stack Developer',
      position: 'Software Developer',
      role: 'EMPLOYEE',
      username: 'santosh'
    },
    {
      employeeId: 'EMP006',
      fullName: 'PUNIT MISHRA',
      email: 'punit.mishra@thyosoftech.com',
      department: 'Management',
      designation: 'Super Administrator',
      position: 'Head of Engineering / Super Admin',
      role: 'SUPER_ADMIN',
      username: 'punit'
    },
    {
      employeeId: 'EMP009',
      fullName: 'AMIT SHARMA',
      email: 'amit.sharma@thyosoftech.com',
      department: 'Operations',
      designation: 'System Administrator',
      position: 'Administrator',
      role: 'ADMIN',
      username: 'admin'
    },
    {
      employeeId: 'EMP007',
      fullName: 'ARJUN MEHTA',
      email: 'arjun.mehta@thyosoftech.com',
      department: 'Sales',
      designation: 'Sales Manager',
      position: 'Manager',
      role: 'MANAGER',
      username: 'arjun'
    },
    {
      employeeId: 'EMP008',
      fullName: 'NEHA SHARMA',
      email: 'neha.sharma@thyosoftech.com',
      department: 'HR',
      designation: 'HR Lead',
      position: 'HR Manager',
      role: 'MANAGER',
      username: 'neha'
    }
  ];

  // Stage 1: Temporary decouple conflicting unique fields (email, username) to prevent unique constraint collisions
  for (const rec of targetRecords) {
    await prisma.user.updateMany({
      where: { employeeId: rec.employeeId },
      data: {
        username: `tmp_${rec.employeeId}_${Date.now()}`,
        email: `tmp_${rec.employeeId}_${Date.now()}@temp.local`
      }
    }).catch(() => {});

    await prisma.employee.updateMany({
      where: { employeeId: rec.employeeId },
      data: {
        email: `tmp_${rec.employeeId}_${Date.now()}@temp.local`
      }
    }).catch(() => {});
  }

  // Also decouple any other users/employees that might hold one of our target emails or usernames
  for (const rec of targetRecords) {
    await prisma.user.updateMany({
      where: {
        OR: [
          { username: rec.username },
          { email: rec.email }
        ],
        NOT: { employeeId: rec.employeeId }
      },
      data: {
        username: `old_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        email: `old_${Date.now()}_${Math.floor(Math.random() * 1000)}@temp.local`
      }
    }).catch(() => {});

    await prisma.employee.updateMany({
      where: {
        email: rec.email,
        NOT: { employeeId: rec.employeeId }
      },
      data: {
        email: `old_emp_${Date.now()}_${Math.floor(Math.random() * 1000)}@temp.local`
      }
    }).catch(() => {});
  }

  // Stage 2: Upsert Employee and linked User records idempotently
  for (const rec of targetRecords) {
    const employee = await prisma.employee.upsert({
      where: { employeeId: rec.employeeId },
      update: {
        fullName: rec.fullName,
        email: rec.email,
        department: rec.department,
        designation: rec.designation,
        position: rec.position,
        status: 'ACTIVE'
      },
      create: {
        employeeId: rec.employeeId,
        fullName: rec.fullName,
        email: rec.email,
        department: rec.department,
        designation: rec.designation,
        position: rec.position,
        status: 'ACTIVE'
      }
    });

    // Upsert User linked to employeeId
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: rec.employeeId },
          { username: rec.username },
          { email: rec.email }
        ]
      }
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          username: rec.username,
          email: rec.email,
          role: rec.role,
          employeeId: rec.employeeId,
          isActive: true
        }
      });
    } else {
      await prisma.user.create({
        data: {
          username: rec.username,
          email: rec.email,
          passwordHash: defaultPasswordHash,
          role: rec.role,
          isActive: true,
          employeeId: rec.employeeId
        }
      });
    }

    console.log(`✓ Synced: ${rec.employeeId} - ${rec.fullName} | Role: ${rec.role} | Dept: ${rec.department}`);
  }

  console.log('\n🎉 Successfully synced all required users in PostgreSQL!');
}

seedUsers()
  .catch((e) => {
    console.error('❌ Error during user sync:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
