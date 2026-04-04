import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [envFile, ...nextArgs] = process.argv.slice(2);

if (!envFile) {
  console.error('Usage: node scripts/run-next-with-env.mjs <env-file> [next args...]');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(1);
}

function parseEnvFile(fileContents) {
  const loadedEnv = {};

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    loadedEnv[key] = value;
  }

  return loadedEnv;
}

const nextBinary = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'next.cmd' : 'next'
);

const child = spawn(nextBinary, nextArgs.length > 0 ? nextArgs : ['dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...parseEnvFile(fs.readFileSync(envPath, 'utf8')),
  },
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
