#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import process from 'node:process';

const DEV_PORTS = [3000, 3001];
const repositoryRoot = realpathSync(process.cwd());

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 1) {
      return '';
    }
    throw error;
  }
}

function listenerPids(port) {
  return run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])
    .split(/\s+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isInteger);
}

function processWorkingDirectory(pid) {
  const output = run('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
  const pathLine = output.split('\n').find((line) => line.startsWith('n'));
  return pathLine ? realpathSync(pathLine.slice(1)) : null;
}

function processCommand(pid) {
  return run('ps', ['-p', String(pid), '-o', 'command=']);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForListenerToStop(port, pid) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!listenerPids(port).includes(pid)) return;
    await delay(50);
  }
  throw new Error(`Next dev listener on port ${port} did not stop after SIGTERM (pid ${pid}).`);
}

for (const port of DEV_PORTS) {
  for (const pid of listenerPids(port)) {
    const cwd = processWorkingDirectory(pid);
    const command = processCommand(pid);
    const isThisRepository = cwd === repositoryRoot;
    const isNextDev = /(?:^|[\\/\s])next(?:-server)?(?:[\\/\s]|$)/i.test(command);

    if (!isThisRepository || !isNextDev) {
      throw new Error(
        `Port ${port} is already owned by another process (pid ${pid}). `
        + 'Stop that process explicitly before starting this repository.',
      );
    }

    process.kill(pid, 'SIGTERM');
    await waitForListenerToStop(port, pid);
    console.log(`Stopped this repository's existing Next dev listener on port ${port} (pid ${pid}).`);
  }
}
