#!/usr/bin/env node

const { execSync } = require('child_process');
const net = require('net');

const PORTS = [8787, 5173];

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function killPortProcess(port) {
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      execSync(`lsof -i :${port} | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' });
    } else if (process.platform === 'win32') {
      execSync(`netstat -ano | findstr :${port} | findstr LISTENING | awk '{print $5}' | xargs taskkill /PID /F 2>/dev/null || true`, { stdio: 'pipe' });
    }
  } catch (err) {
    // Silently fail if port cleanup doesn't work
  }
}

async function cleanup() {
  for (const port of PORTS) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      await killPortProcess(port);
    }
  }
}

cleanup().catch(() => {
  // Continue even if cleanup fails
});
