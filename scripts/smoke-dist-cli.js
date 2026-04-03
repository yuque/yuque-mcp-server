import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCliStartsAndFailsWithoutToken } from './cli-smoke-utils.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli.js');

await assertCliStartsAndFailsWithoutToken(cliPath, {
  cwd: repoRoot,
  label: 'dist CLI smoke test',
});

console.log(`dist CLI smoke test passed: ${cliPath}`);
