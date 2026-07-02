import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { createServer, MCP_SERVER_VERSION, runStdioServer } from '../src/server.js';

vi.mock('axios');

const { transportStart } = vi.hoisted(() => ({
  transportStart: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    start = transportStart;
    send = vi.fn();
    close = vi.fn();
  },
}));

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const mockedAxios = vi.mocked(axios, true);

function getRequestHandler<T>(server: unknown, method: string) {
  return (
    server as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<T>>;
    }
  )._requestHandlers.get(method);
}

describe('createServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as never);
    transportStart.mockResolvedValue(undefined);
  });

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

  it('should register all 19 tools', async () => {
    const server = createServer('test-token');
    const listToolsHandler = getRequestHandler<{ tools: Array<{ name: string }> }>(
      server,
      'tools/list'
    );

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

  it('should call a registered tool through the MCP call handler', async () => {
    const server = createServer('test-token');
    const mockHttpClient = mockedAxios.create.mock.results[0].value as {
      get: ReturnType<typeof vi.fn>;
    };
    mockHttpClient.get.mockResolvedValue({
      data: {
        data: {
          id: 1,
          login: 'tester',
          name: 'Tester',
          description: 'ok',
          avatar_url: 'https://example.com/avatar.png',
          books_count: 2,
          followers_count: 3,
        },
      },
    });

    const callToolHandler = getRequestHandler<{ content: Array<{ text: string }> }>(
      server,
      'tools/call'
    );
    const result = await callToolHandler?.(
      {
        method: 'tools/call',
        params: {
          name: 'yuque_get_user',
          arguments: {},
        },
      },
      {}
    );

    expect(JSON.parse(result?.content[0].text ?? '{}')).toMatchObject({
      id: 1,
      login: 'tester',
    });
  });

  it('should throw for an unknown tool name', async () => {
    const server = createServer('test-token');
    const callToolHandler = getRequestHandler(server, 'tools/call');

    await expect(
      callToolHandler?.(
        {
          method: 'tools/call',
          params: {
            name: 'yuque_unknown',
            arguments: {},
          },
        },
        {}
      )
    ).rejects.toThrow('Unknown tool: yuque_unknown');
  });

  it('should return an MCP error response for invalid tool arguments', async () => {
    const server = createServer('test-token');
    const callToolHandler = getRequestHandler<{
      content: Array<{ text: string }>;
      isError: boolean;
    }>(server, 'tools/call');

    const result = await callToolHandler?.(
      {
        method: 'tools/call',
        params: {
          name: 'yuque_get_book',
          arguments: {},
        },
      },
      {}
    );

    expect(result?.isError).toBe(true);
    expect(result?.content[0].text).toContain('Tool execution failed');
  });

  it('should return an MCP error response when the tool handler fails', async () => {
    const server = createServer('test-token');
    const mockHttpClient = mockedAxios.create.mock.results[0].value as {
      get: ReturnType<typeof vi.fn>;
    };
    mockHttpClient.get.mockRejectedValue(new Error('network down'));
    const callToolHandler = getRequestHandler<{
      content: Array<{ text: string }>;
      isError: boolean;
    }>(server, 'tools/call');

    const result = await callToolHandler?.(
      {
        method: 'tools/call',
        params: {
          name: 'yuque_get_user',
          arguments: {},
        },
      },
      {}
    );

    expect(result?.isError).toBe(true);
    expect(result?.content[0].text).toContain('network down');
  });

  it('should run the stdio server', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runStdioServer('test-token', 'https://yuque.internal/api/v2');

    expect(transportStart).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('Yuque MCP Server running on stdio');
    consoleError.mockRestore();
  });
});
