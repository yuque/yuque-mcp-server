import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { createServer, MCP_SERVER_VERSION } from '../src/server.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

describe('createServer', () => {
  it('should create a server instance', () => {
    const server = createServer('test-token');
    expect(server).toBeDefined();
  });

  it('should use package.json version for MCP server metadata', () => {
    expect(MCP_SERVER_VERSION).toBe(packageJson.version);
  });

  it('should register all 19 tools', async () => {
    const server = createServer('test-token');
    const listToolsHandler = (
      server as unknown as {
        _requestHandlers: Map<
          string,
          (request: unknown, extra: unknown) => Promise<{ tools: Array<{ name: string }> }>
        >;
      }
    )._requestHandlers.get('tools/list');

    const result = await listToolsHandler?.({ method: 'tools/list', params: {} }, {});

    expect(result?.tools).toHaveLength(19);
    expect(result?.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'yuque_get_resource',
        'yuque_create_resource',
        'yuque_update_resource',
      ])
    );
  });
});
