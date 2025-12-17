import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const children = [];

function startProcess(command, args, label) {
  const child = spawn(command, args, { stdio: 'inherit' });
  children.push(child);

  child.on('exit', (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`[dev] ${label} exited with code ${code}`);
      shutdown(code);
    }
  });
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

startProcess(npmCmd, ['run', 'start'], 'ng serve');
startProcess(
  npxCmd,
  ['wrangler', 'pages', 'dev', '--proxy', '4200'],
  'wrangler pages dev'
);
