const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const { PrismaClient } = require('@prisma/client');

// Automatically route Supabase Session Pooler (:5432, max 15 clients) to
// Supabase Transaction Pooler (:6543, pgbouncer=true) for runtime queries
// to prevent EMAXCONNSESSION pool exhaustion while keeping DIRECT_URL on :5432.
let runtimeDbUrl = process.env.DATABASE_URL;
if (runtimeDbUrl && runtimeDbUrl.includes('pooler.supabase.com:5432')) {
  const base = runtimeDbUrl.split('?')[0].replace(':5432/', ':6543/');
  runtimeDbUrl = `${base}?pgbouncer=true&connection_limit=12&connect_timeout=30&pool_timeout=30`;
}

const prisma = new PrismaClient({
  ...(runtimeDbUrl ? { datasources: { db: { url: runtimeDbUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  errorFormat: 'minimal'
});

// Let Prisma's built-in connection pool handle socket replacement on transient errors;
// avoid force-disconnecting the pool on single-query socket resets.
if (prisma.$on) {
  prisma.$on('error', (e) => {
    console.warn('Prisma transient connection warning:', e?.message || e);
  });
}

module.exports = prisma;
