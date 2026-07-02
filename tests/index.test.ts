import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type HttpHandler = (
  req: unknown,
  res: { statusCode?: number; end: (body: string) => void }
) => void;

const indexMocks = vi.hoisted(() => ({
  createMCPServer: vi.fn(),
  connect: vi.fn(),
  handleRequest: vi.fn(),
  listen: vi.fn(),
  httpHandler: undefined as HttpHandler | undefined,
  sessionId: undefined as string | undefined,
}));

vi.mock('../src/server.js', () => ({
  createServer: indexMocks.createMCPServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn(function (
    this: { handleRequest: typeof indexMocks.handleRequest },
    options: { sessionIdGenerator: () => string }
  ) {
    indexMocks.sessionId = options.sessionIdGenerator();
    this.handleRequest = indexMocks.handleRequest;
  }),
}));

vi.mock('node:http', () => ({
  createServer: vi.fn((handler: HttpHandler) => {
    indexMocks.httpHandler = handler;
    return {
      listen: indexMocks.listen,
    };
  }),
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'uuid-1'),
}));

const originalArgv = process.argv;
const originalToken = process.env.YUQUE_TOKEN;
const originalLegacyToken = process.env.YUQUE_PERSONAL_TOKEN;
const originalHost = process.env.YUQUE_HOST;
const originalLegacyBaseURL = process.env.YUQUE_BASE_URL;
const originalPort = process.env.PORT;
let indexImportRun = 0;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

async function importHttpEntry() {
  const importers = [
    () => import('../src/index.js?case=0'),
    () => import('../src/index.js?case=1'),
    () => import('../src/index.js?case=2'),
    () => import('../src/index.js?case=3'),
  ];
  const importer = importers[indexImportRun++];
  if (!importer) throw new Error('No HTTP entry import slot left');
  return importer();
}

function mockExit(throws = true) {
  return vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    if (throws) {
      throw new Error(`exit:${code}`);
    }
    return undefined as never;
  });
}

describe('HTTP entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    indexMocks.connect.mockResolvedValue(undefined);
    indexMocks.handleRequest.mockResolvedValue(undefined);
    indexMocks.listen.mockImplementation((_port: number, callback: () => void) => callback());
    indexMocks.createMCPServer.mockReturnValue({
      connect: indexMocks.connect,
    });
    indexMocks.httpHandler = undefined;
    indexMocks.sessionId = undefined;
    process.argv = ['node', 'index.js'];
    delete process.env.YUQUE_TOKEN;
    delete process.env.YUQUE_PERSONAL_TOKEN;
    delete process.env.YUQUE_HOST;
    delete process.env.YUQUE_BASE_URL;
    delete process.env.PORT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv;
    restoreEnv('YUQUE_TOKEN', originalToken);
    restoreEnv('YUQUE_PERSONAL_TOKEN', originalLegacyToken);
    restoreEnv('YUQUE_HOST', originalHost);
    restoreEnv('YUQUE_BASE_URL', originalLegacyBaseURL);
    restoreEnv('PORT', originalPort);
  });

  it('should exit when token is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    await expect(importHttpEntry()).rejects.toThrow('exit:1');

    expect(error).toHaveBeenCalledWith(
      'Error: YUQUE_TOKEN environment variable, YUQUE_PERSONAL_TOKEN environment variable, or --token argument is required'
    );
  });

  it('should start HTTP server and handle request failures', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.argv = [
      'node',
      'index.js',
      '--token=arg-token',
      '--host=https://yuque.internal',
    ];
    process.env.PORT = '4242';

    await importHttpEntry();
    await Promise.resolve();

    expect(indexMocks.createMCPServer).toHaveBeenCalledWith(
      'arg-token',
      'https://yuque.internal/api/v2'
    );
    expect(indexMocks.sessionId).toBe('uuid-1');
    expect(indexMocks.listen).toHaveBeenCalledWith(4242, expect.any(Function));
    expect(log).toHaveBeenCalledWith('Yuque MCP Server running on http://localhost:4242');

    indexMocks.handleRequest.mockRejectedValue(new Error('request failed'));
    const res = {
      statusCode: 200,
      end: vi.fn(),
    };
    indexMocks.httpHandler?.({}, res);
    await Promise.resolve();

    expect(error).toHaveBeenCalledWith('Request handling error:', expect.any(Error));
    expect(res.statusCode).toBe(500);
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });

  it('should use environment token and default port', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';
    process.env.YUQUE_HOST = 'https://env.example';

    await importHttpEntry();
    await Promise.resolve();

    expect(indexMocks.createMCPServer).toHaveBeenCalledWith(
      'env-token',
      'https://env.example/api/v2'
    );
    expect(indexMocks.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(log).toHaveBeenCalledWith('Yuque MCP Server running on http://localhost:3000');
  });

  it('should exit when MCP server connection fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';
    indexMocks.connect.mockRejectedValue(new Error('connect failed'));
    mockExit(false);

    await importHttpEntry();
    await Promise.resolve();

    expect(error).toHaveBeenCalledWith('Failed to start server:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
