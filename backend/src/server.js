const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const { warmUpCaches } = require('./config/cacheWarmup');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection on startup
    await prisma.$connect();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('------------------------------------------------------------');
      console.log('🏢 THYO SOFTECH PVT LTD - HRMS TASK MANAGEMENT SYSTEM');
      console.log('✓ Connected to PostgreSQL Database via Prisma');
      console.log(`✓ Server running at http://localhost:${PORT}`);
      console.log(`✓ Health Check: http://localhost:${PORT}/api/health`);
      console.log(`✓ Tasks API: http://localhost:${PORT}/api/tasks`);
      console.log('------------------------------------------------------------');
      warmUpCaches();
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[${signal}] Shutting down server gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✓ Prisma disconnected. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
