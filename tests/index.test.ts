import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type HttpHandler = (req: unknown, res: MockRes) => void;

interface MockRes {
  statusCode: number;
  headersSent: boolean;
  writeHead: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
}

interface MockTransport {
  handleRequest: ReturnType<typeof vi.fn>;
  sessionId?: string;
  onclose?: () => void;
  options: {
    sessionIdGenerator: () => string;
    enableDnsRebindingProtection?: boolean;
    allowedHosts?: string[];
    onsessioninitialized?: (sid: string) => void;
  };
}

const indexMocks = vi.hoisted(() => ({
  createMCPServer: vi.fn(),
  connect: vi.fn(),
  handleRequest: vi.fn(),
  listen: vi.fn(),
  httpHandler: undefined as HttpHandler | undefined,
  transports: [] as MockTransport[],
}));

vi.mock('../src/server.js', () => ({
  createServer: indexMocks.createMCPServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn(function (
    this: MockTransport,
    options: MockTransport['options']
  ) {
    this.options = options;
    this.handleRequest = indexMocks.handleRequest;
    indexMocks.transports.push(this);
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
const originalBindHost = process.env.HOST;
let indexImportRun = 0;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

async function importHttpEntry() {
  // Each test needs a fresh module instance; static query strings defeat the ESM cache.
  const importers = [
    () => import('../src/index.js?case=0'),
    () => import('../src/index.js?case=1'),
    () => import('../src/index.js?case=2'),
    () => import('../src/index.js?case=3'),
    () => import('../src/index.js?case=4'),
    () => import('../src/index.js?case=5'),
    () => import('../src/index.js?case=6'),
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

function makeReq(
  method: string,
  headers: Record<string, string> = {},
  body?: unknown
): AsyncIterable<Buffer> & { method: string; headers: Record<string, string> } {
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) {
        yield Buffer.from(JSON.stringify(body));
      }
    },
  };
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headersSent: false,
    writeHead: vi.fn((status: number) => {
      res.statusCode = status;
      res.headersSent = true;
      return res;
    }),
    end: vi.fn(),
  };
  return res;
}

const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
};

async function dispatch(req: unknown, res: MockRes) {
  indexMocks.httpHandler?.(req, res);
  // Drain the async handler chain.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('HTTP entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    indexMocks.connect.mockResolvedValue(undefined);
    indexMocks.handleRequest.mockResolvedValue(undefined);
    indexMocks.listen.mockImplementation((_port: number, _host: string, callback: () => void) =>
      callback()
    );
    indexMocks.createMCPServer.mockReturnValue({
      connect: indexMocks.connect,
    });
    indexMocks.httpHandler = undefined;
    indexMocks.transports = [];
    process.argv = ['node', 'index.js'];
    delete process.env.YUQUE_TOKEN;
    delete process.env.YUQUE_PERSONAL_TOKEN;
    delete process.env.YUQUE_HOST;
    delete process.env.YUQUE_BASE_URL;
    delete process.env.PORT;
    delete process.env.HOST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv;
    restoreEnv('YUQUE_TOKEN', originalToken);
    restoreEnv('YUQUE_PERSONAL_TOKEN', originalLegacyToken);
    restoreEnv('YUQUE_HOST', originalHost);
    restoreEnv('YUQUE_BASE_URL', originalLegacyBaseURL);
    restoreEnv('PORT', originalPort);
    restoreEnv('HOST', originalBindHost);
  });

  it('should exit when token is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    await expect(importHttpEntry()).rejects.toThrow('exit:1');

    expect(error).toHaveBeenCalledWith(
      'Error: YUQUE_TOKEN environment variable, YUQUE_PERSONAL_TOKEN environment variable, or --token argument is required'
    );
  });

  it('should bind to loopback with the default port', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';

    await importHttpEntry();

    expect(indexMocks.listen).toHaveBeenCalledWith(3000, '127.0.0.1', expect.any(Function));
    expect(log).toHaveBeenCalledWith('Yuque MCP Server running on http://127.0.0.1:3000');
  });

  it('should create one session per initialize request and route follow-ups by session id', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.argv = ['node', 'index.js', '--token=arg-token', '--host=https://yuque.internal'];
    process.env.PORT = '4242';

    await importHttpEntry();

    expect(indexMocks.listen).toHaveBeenCalledWith(4242, '127.0.0.1', expect.any(Function));

    // Initialize request without a session id creates a fresh transport + MCP server.
    const initReq = makeReq('POST', {}, initializeBody);
    const initRes = makeRes();
    await dispatch(initReq, initRes);

    expect(indexMocks.transports).toHaveLength(1);
    expect(indexMocks.createMCPServer).toHaveBeenCalledWith(
      'arg-token',
      'https://yuque.internal/api/v2'
    );
    expect(indexMocks.connect).toHaveBeenCalledTimes(1);
    expect(indexMocks.handleRequest).toHaveBeenCalledWith(initReq, initRes, initializeBody);

    const transport = indexMocks.transports[0];
    expect(transport.options.enableDnsRebindingProtection).toBe(true);
    expect(transport.options.allowedHosts).toContain('127.0.0.1:4242');
    expect(transport.options.sessionIdGenerator()).toBe('uuid-1');

    // Session registration happens through the SDK callback.
    transport.sessionId = 'uuid-1';
    transport.options.onsessioninitialized?.('uuid-1');

    // A follow-up request with the session id reuses the same transport.
    const followUpReq = makeReq('POST', { 'mcp-session-id': 'uuid-1' });
    const followUpRes = makeRes();
    await dispatch(followUpReq, followUpRes);

    expect(indexMocks.transports).toHaveLength(1);
    expect(indexMocks.handleRequest).toHaveBeenCalledWith(followUpReq, followUpRes);

    // Closing the transport unregisters the session.
    transport.onclose?.();
    const staleReq = makeReq('POST', { 'mcp-session-id': 'uuid-1' });
    const staleRes = makeRes();
    await dispatch(staleReq, staleRes);
    expect(staleRes.statusCode).toBe(404);
  });

  it('should reject requests without a session that are not initialize', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';

    await importHttpEntry();

    const getReq = makeReq('GET');
    const getRes = makeRes();
    await dispatch(getReq, getRes);
    expect(getRes.statusCode).toBe(400);

    const postReq = makeReq('POST', {}, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const postRes = makeRes();
    await dispatch(postReq, postRes);
    expect(postRes.statusCode).toBe(400);

    expect(indexMocks.transports).toHaveLength(0);
  });

  it('should return 404 for unknown session ids', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';

    await importHttpEntry();

    const req = makeReq('POST', { 'mcp-session-id': 'missing' });
    const res = makeRes();
    await dispatch(req, res);

    expect(res.statusCode).toBe(404);
    expect(indexMocks.transports).toHaveLength(0);
  });

  it('should respond with 500 when request handling fails', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';

    await importHttpEntry();

    indexMocks.connect.mockRejectedValue(new Error('connect failed'));
    const req = makeReq('POST', {}, initializeBody);
    const res = makeRes();
    await dispatch(req, res);

    expect(error).toHaveBeenCalledWith('Request handling error:', expect.any(Error));
    expect(res.statusCode).toBe(500);
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });

  it('should disable DNS rebinding protection when HOST exposes other interfaces', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.YUQUE_TOKEN = 'env-token';
    process.env.HOST = '0.0.0.0';

    await importHttpEntry();

    expect(indexMocks.listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));

    const req = makeReq('POST', {}, initializeBody);
    const res = makeRes();
    await dispatch(req, res);

    expect(indexMocks.transports).toHaveLength(1);
    expect(indexMocks.transports[0].options.enableDnsRebindingProtection).toBe(false);
  });
});
