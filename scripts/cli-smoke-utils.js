import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

export const EXPECTED_MISSING_TOKEN_MESSAGE =
  'Error: YUQUE_PERSONAL_TOKEN environment variable or --token argument is required';

const DEFAULT_TIMEOUT_MS = 5000;

function formatStream(name, content) {
  const normalized = content.trim();
  return `${name}:\n${normalized || '(empty)'}`;
}

export async function assertCliStartsAndFailsWithoutToken(
  cliPath,
  { cwd = path.dirname(cliPath), label = cliPath, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  await access(cliPath);

  const child = spawn(process.execPath, [ cliPath ], {
    cwd,
    env: {
      ...process.env,
      YUQUE_PERSONAL_TOKEN: '',
    },
    stdio: [ 'pipe', 'pipe', 'pipe' ],
  });

  child.stdin.end();

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
      `${label} timed out after ${timeoutMs}ms while validating CLI startup.\n` +
        `${formatStream('stdout', stdout)}\n${formatStream('stderr', stderr)}`
    );
  }

  if (result.signal) {
    throw new Error(
      `${label} exited via unexpected signal ${result.signal}.\n` +
        `${formatStream('stdout', stdout)}\n${formatStream('stderr', stderr)}`
    );
  }

  if (result.code !== 1 || !stderr.includes(EXPECTED_MISSING_TOKEN_MESSAGE)) {
    const importFailure = stderr.includes('ERR_IMPORT_ATTRIBUTE_MISSING')
      ? '\nDetected runtime module loading failure before CLI argument validation.'
      : '';
    throw new Error(
      `${label} did not reach the expected missing-token failure path.` +
        `${importFailure}\nExpected exit code: 1\nActual exit code: ${result.code}\n` +
        `Expected stderr to include:\n${EXPECTED_MISSING_TOKEN_MESSAGE}\n` +
        `${formatStream('stdout', stdout)}\n${formatStream('stderr', stderr)}`
    );
  }
}
