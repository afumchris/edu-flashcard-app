#!/usr/bin/env node

const { spawn } = require('child_process');

// Start the actual React dev server
const child = spawn('npx', ['craco', 'start'], {
  stdio: 'pipe',
  shell: true
});

let hasDisplayedBanner = false;

// Detect environment
const isGitpod = process.env.GITPOD_ENVIRONMENT_ID !== undefined;
const { execSync } = require('child_process');

// Capture output and display our banner when server is ready
child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // When we see "Compiled successfully", display our custom banner
  if (output.includes('Compiled successfully') && !hasDisplayedBanner) {
    hasDisplayedBanner = true;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Frontend Server Ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (isGitpod) {
      // Use Gitpod CLI to get the actual URL
      try {
        const url = execSync(`/usr/local/bin/gitpod environment port list | grep "^3000" | awk '{print $3}'`, { encoding: 'utf-8' }).trim();
        if (url) {
          console.log(`📍 Frontend URL: ${url}`);
        } else {
          console.log(`📍 Frontend URL: Check PORTS panel for port 3000`);
        }
        console.log(`🌐 Environment: Gitpod`);
      } catch (err) {
        console.log(`📍 Frontend URL: Check PORTS panel for port 3000`);
        console.log(`🌐 Environment: Gitpod`);
      }
    } else {
      console.log(`📍 Frontend URL: http://localhost:3000`);
      console.log(`🌐 Environment: Local`);
    }
    
    console.log(`⚡ Port: 3000`);
    console.log(`✅ Status: Ready`);
    console.log(`💡 Tip: Use the PORTS panel to access the URL`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('error', (error) => {
  console.error('Failed to start frontend:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
