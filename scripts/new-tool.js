import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function fail(message) {
  console.error(`error: ${message}`);
  console.error('');
  console.error('usage:   npm run new:tool -- <domain> <yuque_tool_name>');
  console.error('example: npm run new:tool -- comment yuque_list_comments');
  process.exit(1);
}

const [domain, toolName] = process.argv.slice(2);

if (!domain || !toolName) fail('missing arguments');
if (!/^[a-z]+$/.test(domain)) {
  fail(`domain "${domain}" must be a single lowercase word (like doc, book, note)`);
}
if (!/^yuque_[a-z][a-z_]*$/.test(toolName)) {
  fail(`tool name "${toolName}" must follow yuque_<verb>_<resource> in lowercase`);
}

const toolsDir = path.join(repoRoot, 'src', 'tools');
const toolFile = path.join(toolsDir, `${domain}.ts`);
const testFile = path.join(repoRoot, 'tests', 'tools', `${domain}.test.ts`);
const toolsVar = `${domain}Tools`;

for (const existing of fs.readdirSync(toolsDir)) {
  const content = fs.readFileSync(path.join(toolsDir, existing), 'utf8');
  if (content.includes(`${toolName}:`)) {
    fail(`${toolName} already exists in src/tools/${existing}`);
  }
}

const toolStub = `  ${toolName}: {
    description: 'TODO: describe what this tool does and its key parameters',
    inputSchema: z.object({}),
    handler: async (_client: YuqueClient, _args: Record<string, never>) => {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'TODO: implement ${toolName} (see docs/workflows/add-tool.md)',
          },
        ],
      };
    },
  },
`;

const toolFileContent = `import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';

export const ${toolsVar} = {
${toolStub}};
`;

const testFileContent = `import { describe, it, expect } from 'vitest';
import { ${toolsVar} } from '../../src/tools/${domain}.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

describe('${toolsVar}', () => {
  describe('${toolName}', () => {
    it('should be implemented (replace this placeholder with real assertions)', async () => {
      const result = await ${toolsVar}.${toolName}.handler({} as YuqueClient, {} as never);

      expect(result.content[0].type).toBe('text');
    });
  });
});
`;

const created = [];
const domainExists = fs.existsSync(toolFile);

if (domainExists) {
  console.log(`src/tools/${domain}.ts already exists — not modifying it.`);
  console.log(`Paste this into the ${toolsVar} object yourself:`);
  console.log('');
  console.log(toolStub);
} else {
  fs.writeFileSync(toolFile, toolFileContent);
  created.push(`src/tools/${domain}.ts`);
  if (fs.existsSync(testFile)) {
    console.log(`tests/tools/${domain}.test.ts already exists — not modifying it.`);
  } else {
    fs.writeFileSync(testFile, testFileContent);
    created.push(`tests/tools/${domain}.test.ts`);
  }
}

if (created.length > 0) {
  console.log('Created:');
  for (const file of created) console.log(`  ${file}`);
  console.log('');
}

console.log(`Next steps for ${toolName} (full recipe: docs/workflows/add-tool.md):`);
console.log('  1. Add the API method and types in src/services/yuque-client.ts and src/services/types.ts');
console.log(`  2. Implement the real inputSchema and handler in src/tools/${domain}.ts`);
if (!domainExists) {
  console.log(`  3. Register the new domain in src/server.ts: spread ...${toolsVar} into allTools`);
} else {
  console.log('  3. (domain already registered in src/server.ts — nothing to do)');
}
console.log(`  4. Replace the placeholder test in tests/tools/${domain}.test.ts with real assertions`);
console.log('  5. Pin the contract: add the tool to expectedToolNames and requiredFieldsByTool in');
console.log('     tests/mcp/tool-registry-contract.test.ts, and cover it in tests/mcp/tool-call-contract.test.ts');
console.log('  6. Document it in docs/capability-scope.md: summary table, domain section,');
console.log('     and every "N 个 MCP tools" count (a contract test verifies this)');
console.log('  7. npm run check must pass before you open the PR');
