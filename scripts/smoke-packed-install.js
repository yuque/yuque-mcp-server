import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCliStartsAndFailsWithoutToken } from './cli-smoke-utils.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function buildCleanEnv(extraEnv = {}) {
  const env = {};

  for (const [ key, value ] of Object.entries(process.env)) {
    if (key.startsWith('npm_') || key.startsWith('NPM_')) {
      continue;
    }
    env[key] = value;
  }

  return {
    ...env,
    ...extraEnv,
  };
}

function resolveNpmCache(tempRoot) {
  return process.env.YUQUE_MCP_SMOKE_NPM_CACHE || path.join(tempRoot, 'npm-cache');
}

function getNpmCommand(args) {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [ process.env.npm_execpath, ...args ],
    };
  }

  return {
    command: 'npm',
    args,
  };
}

async function runCommand(command, args, { cwd, env, label, timeoutMs = 120000 }) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: [ 'ignore', 'pipe', 'pipe' ],
  });

  let stdout = '';
  let stderr = '';
  let timedOut = false;

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    stdout += chunk;
  });
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });

    child.once('close', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });

  if (timedOut) {
    throw new Error(
      `${label} timed out after ${timeoutMs}ms.\nstdout:\n${stdout.trim() || '(empty)'}\n` +
        `stderr:\n${stderr.trim() || '(empty)'}`
    );
  }

  if (result.code !== 0 || result.signal) {
    throw new Error(
      `${label} failed with code ${result.code}${result.signal ? ` and signal ${result.signal}` : ''}.\n` +
        `stdout:\n${stdout.trim() || '(empty)'}\nstderr:\n${stderr.trim() || '(empty)'}`
    );
  }

  return { stdout, stderr };
}

async function main() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'yuque-mcp-pack-smoke-'));
  const packDir = path.join(tempRoot, 'pack');
  const installDir = path.join(tempRoot, 'install');
  const npmCache = resolveNpmCache(tempRoot);
  const npmEnv = buildCleanEnv({
    npm_config_cache: npmCache,
    NPM_CONFIG_CACHE: npmCache,
  });

  try {
    await mkdir(packDir, { recursive: true });
    await mkdir(installDir, { recursive: true });

    const packCommand = getNpmCommand([ 'pack', '--json', '--cache', npmCache, repoRoot ]);
    const packResult = await runCommand(packCommand.command, packCommand.args, {
      cwd: packDir,
      env: npmEnv,
      label: 'npm pack',
    });

    const packInfo = JSON.parse(packResult.stdout);
    if (!Array.isArray(packInfo) || packInfo.length === 0 || !packInfo[0]?.filename) {
      throw new Error(`npm pack returned unexpected JSON:\n${packResult.stdout}`);
    }

    const tarballPath = path.join(packDir, packInfo[0].filename);

    await writeFile(
      path.join(installDir, 'package.json'),
      JSON.stringify({ name: 'yuque-mcp-pack-smoke', private: true }, null, 2) + '\n',
      'utf8'
    );

    const installCommand = getNpmCommand([
      'install',
      '--cache',
      npmCache,
      '--prefer-offline',
      '--fetch-retries',
      '0',
      '--fetch-timeout',
      '30000',
      '--ignore-scripts',
      '--no-package-lock',
      tarballPath,
    ]);

    await runCommand(installCommand.command, installCommand.args, {
      cwd: installDir,
      env: npmEnv,
      label: 'npm install tarball',
      timeoutMs: 60000,
    });

    const installedPackageJsonPath = path.join(installDir, 'node_modules', 'yuque-mcp', 'package.json');
    const installedPackageJson = JSON.parse(await readFile(installedPackageJsonPath, 'utf8'));
    const cliRelativePath = installedPackageJson.bin?.['yuque-mcp'];

    if (typeof cliRelativePath !== 'string' || cliRelativePath.length === 0) {
      throw new Error(`Installed package is missing a yuque-mcp bin entry: ${installedPackageJsonPath}`);
    }

    const installedCliPath = path.join(installDir, 'node_modules', 'yuque-mcp', cliRelativePath);

    await assertCliStartsAndFailsWithoutToken(installedCliPath, {
      cwd: installDir,
      label: 'packed install CLI smoke test',
    });

    console.log(`packed install smoke test passed: ${tarballPath}`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

await main();
