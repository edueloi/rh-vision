const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const tsxCliPath = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function parseMajor(versionText) {
  const match = /^v?(\d+)/.exec(String(versionText || '').trim());
  return match ? Number(match[1]) : 0;
}

function pickNodeBinary() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    process.env.RH_VISION_NODE_PATH,
    path.join(localAppData, 'nvs', 'default', 'node.exe'),
    process.execPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    if (candidate === process.execPath && parseMajor(process.version) >= 18) {
      return candidate;
    }

    if (candidate !== process.execPath) {
      return candidate;
    }
  }

  return process.execPath;
}

const nodeBinary = pickNodeBinary();

if (!fs.existsSync(tsxCliPath)) {
  console.error('Arquivo do tsx não encontrado em node_modules/tsx/dist/cli.mjs');
  process.exit(1);
}

const child = spawn(nodeBinary, [tsxCliPath, 'server.ts'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Falha ao iniciar o servidor de desenvolvimento:', error.message);
  process.exit(1);
});
