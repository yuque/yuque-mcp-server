import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../src/server.js';

type ListedTool = { name: string };

const docPath = fileURLToPath(new URL('../../docs/capability-scope.md', import.meta.url));

function getListToolsHandler(server: unknown) {
  return (
    server as {
      _requestHandlers: Map<
        string,
        (request: unknown, extra: unknown) => Promise<{ tools: ListedTool[] }>
      >;
    }
  )._requestHandlers.get('tools/list');
}

async function listRegisteredToolNames() {
  const server = createServer('test-token');
  const handler = getListToolsHandler(server);
  if (!handler) throw new Error('tools/list handler missing');
  const result = await handler({ method: 'tools/list', params: {} }, {});
  return result.tools.map((tool) => tool.name).sort();
}

describe('docs/capability-scope.md stays in sync with the tool registry', () => {
  it('should document exactly the registered MCP tools', async () => {
    const registered = await listRegisteredToolNames();
    const doc = readFileSync(docPath, 'utf8');
    const documented = [
      ...new Set(Array.from(doc.matchAll(/`(yuque_[a-z_]+)`/g), (match) => match[1])),
    ].sort();

    const missingFromDocs = registered.filter((name) => !documented.includes(name));
    const staleInDocs = documented.filter((name) => !registered.includes(name));

    expect(
      missingFromDocs,
      `Tools registered in code but missing from docs/capability-scope.md: ${missingFromDocs.join(', ')}. Add them to the Tool Summary table and the matching section.`
    ).toEqual([]);
    expect(
      staleInDocs,
      `Tools documented in docs/capability-scope.md but not registered in src: ${staleInDocs.join(', ')}. Remove them from the doc, or register the missing tool if removal was unintended.`
    ).toEqual([]);
  });

  it('should declare a tool count that matches the registry', async () => {
    const registered = await listRegisteredToolNames();
    const doc = readFileSync(docPath, 'utf8');
    const countClaims = Array.from(doc.matchAll(/(\d+) 个 MCP tools/g), (match) =>
      Number(match[1])
    );

    expect(
      countClaims.length,
      'docs/capability-scope.md no longer states the "N 个 MCP tools" total. Keep the declared count so readers and this test can verify the surface size.'
    ).toBeGreaterThan(0);
    for (const claimed of countClaims) {
      expect(
        claimed,
        `docs/capability-scope.md claims ${claimed} MCP tools but ${registered.length} are registered. Update every "N 个 MCP tools" mention in the doc.`
      ).toBe(registered.length);
    }
  });
});
