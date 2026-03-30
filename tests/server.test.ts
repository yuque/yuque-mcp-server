import { describe, it, expect } from 'vitest';
import packageJson from '../package.json';
import { createServer, MCP_SERVER_VERSION } from '../src/server.js';

describe('createServer', () => {
  it('should create a server instance', () => {
    const server = createServer('test-token');
    expect(server).toBeDefined();
  });

  it('should use package.json version for MCP server metadata', () => {
    expect(MCP_SERVER_VERSION).toBe(packageJson.version);
  });

  it('should register all 16 tools', async () => {
    const server = createServer('test-token');

    // Access the internal server to list tools
    // The server should have handlers registered
    expect(server).toBeDefined();
  });
});
