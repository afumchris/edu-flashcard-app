#!/usr/bin/env node

const { spawn } = require('child_process');

// Display startup banner
console.log('\n🚀 Frontend Server Starting...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Detect environment
const isGitpod = process.env.GITPOD_WORKSPACE_ID !== undefined;
const gitpodUrl = process.env.GITPOD_WORKSPACE_URL;

if (isGitpod && gitpodUrl) {
  const workspaceUrl = gitpodUrl.replace('https://', '');
  const frontendUrl = `https://3000--${workspaceUrl}`;
  console.log(`📍 Frontend URL: ${frontendUrl}`);
  console.log(`🌐 Environment: Gitpod`);
} else {
  console.log(`📍 Frontend URL: http://localhost:3000`);
  console.log(`🌐 Environment: Local`);
}

console.log(`⚡ Port: 3000`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Start the actual React dev server
const child = spawn('npx', ['craco', 'start'], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start frontend:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
