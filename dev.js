const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting THYO SOFTECH HRMS Task Management System...');
console.log('📦 Starting Backend on port 5000 & Frontend on port 5173...\n');

const backend = spawn('node', ['src/server.js'], {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'inherit'
});

const frontend = spawn('npx', ['vite'], {
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: 'inherit'
});

function cleanup() {
  console.log('\n🛑 Stopping servers...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
