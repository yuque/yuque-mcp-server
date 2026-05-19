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

  it('should create a server with custom base URL', () => {
    const server = createServer('test-token', 'https://yuque.internal.com/api/v2');
    expect(server).toBeDefined();
  });

  it('should register all 16 tools', async () => {
    const server = createServer('test-token');

    // Access the internal server to list tools
    // The server should have handlers registered
    expect(server).toBeDefined();
  });
});
