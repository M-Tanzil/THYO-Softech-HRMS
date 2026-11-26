const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateRolesAndEmployees() {
  console.log('🔄 Idempotent Role & Employee Data Update Starting...');

  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const managerPassword = await bcrypt.hash('Manager@12345', 10);
  const hrPassword = await bcrypt.hash('Hr@12345', 10);
  const employeePassword = await bcrypt.hash('Employee@12345', 10);

  const dataset = [
    {
      employeeId: 'EMP001',
      fullName: 'RUPAM BHARGOV',
      email: 'rupam.bhargov@thyosoftech.com',
      phone: '+91 98765 43210',
      department: 'IT',
      designation: 'Senior Software Engineer',
      position: 'Software Developer',
      status: 'ACTIVE',
      role: 'EMPLOYEE',
      username: 'rupam',
      passwordHash: employeePassword
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
      role: 'EMPLOYEE',
      username: 'tanzil',
      passwordHash: employeePassword
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
      role: 'EMPLOYEE',
      username: 'riya',
      passwordHash: employeePassword
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
      role: 'EMPLOYEE',
      username: 'anshuman',
      passwordHash: employeePassword
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
      role: 'EMPLOYEE',
      username: 'santosh',
      passwordHash: employeePassword
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
      role: 'SUPER_ADMIN',
      username: 'punit',
      passwordHash: adminPassword
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
      role: 'ADMIN',
      username: 'admin',
      passwordHash: adminPassword
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
      role: 'MANAGER',
      username: 'arjun',
      passwordHash: managerPassword
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
      role: 'MANAGER',
      username: 'neha',
      passwordHash: managerPassword
    }
  ];

  // 1. Safe Employee Upsert
  for (const item of dataset) {
    const emp = await prisma.employee.upsert({
      where: { employeeId: item.employeeId },
      create: {
        employeeId: item.employeeId,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        department: item.department,
        designation: item.designation,
        position: item.position,
        status: item.status
      },
      update: {
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        department: item.department,
        designation: item.designation,
        position: item.position,
        status: item.status
      }
    });
    console.log(`✓ Employee upserted: ${emp.employeeId} - ${emp.fullName} (${emp.department})`);
  }

  // 2. Safe User Upsert (maintains User-Employee relationship)
  for (const item of dataset) {
    const existingUser = await prisma.user.findUnique({
      where: { employeeId: item.employeeId }
    });

    if (existingUser) {
      const updatedUser = await prisma.user.update({
        where: { employeeId: item.employeeId },
        data: {
          role: item.role,
          email: item.email,
          username: item.username,
          passwordHash: item.passwordHash,
          isActive: true
        }
      });
      console.log(`✓ User updated: ${updatedUser.username} (${updatedUser.employeeId}) -> Role: ${updatedUser.role}`);
    } else {
      const createdUser = await prisma.user.create({
        data: {
          employeeId: item.employeeId,
          username: item.username,
          email: item.email,
          role: item.role,
          passwordHash: item.passwordHash,
          isActive: true
        }
      });
      console.log(`✓ User created: ${createdUser.username} (${createdUser.employeeId}) -> Role: ${createdUser.role}`);
    }
  }

  // 3. Verification of final counts
  const totalEmployees = await prisma.employee.count();
  const totalUsers = await prisma.user.count();
  console.log(`\n🎉 Data update complete! Total Employees: ${totalEmployees}, Total Users: ${totalUsers}`);
}

updateRolesAndEmployees()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
