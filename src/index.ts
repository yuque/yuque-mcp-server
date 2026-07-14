import { createServer as createMCPServer } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MISSING_TOKEN_MESSAGE, resolveYuqueBaseURL, resolveYuqueToken } from './config.js';

const resolvedToken = resolveYuqueToken();

if (!resolvedToken) {
  console.error(MISSING_TOKEN_MESSAGE);
  process.exit(1);
}

// Re-bind after the guard so hoisted functions see a plain string type.
const token: string = resolvedToken;

const baseURL = resolveYuqueBaseURL();
const port = Number(process.env.PORT) || 3000;
// Bind to loopback by default; set HOST explicitly to expose the server on other interfaces.
const host = process.env.HOST || '127.0.0.1';
const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';

// A stateful StreamableHTTPServerTransport serves exactly one MCP session,
// so each session gets its own transport + MCP server pair.
const transports = new Map<string, StreamableHTTPServerTransport>();

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : undefined;
}

function sendJsonRpcError(res: ServerResponse, status: number, code: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }));
}

async function handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
  const sessionId = req.headers['mcp-session-id'];

  if (typeof sessionId === 'string') {
    const transport = transports.get(sessionId);
    if (!transport) {
      sendJsonRpcError(res, 404, -32001, 'Session not found');
      return;
    }
    await transport.handleRequest(req, res);
    return;
  }

  if (req.method !== 'POST') {
    sendJsonRpcError(res, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
    return;
  }

  const body = await readJsonBody(req);
  if (!isInitializeRequest(body)) {
    sendJsonRpcError(res, 400, -32000, 'Bad Request: expected an initialize request');
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    // Validate the Host header on local deployments so malicious web pages
    // cannot reach the server through DNS rebinding.
    enableDnsRebindingProtection: isLoopback,
    allowedHosts: isLoopback
      ? ['127.0.0.1', `127.0.0.1:${port}`, 'localhost', `localhost:${port}`]
      : undefined,
    onsessioninitialized: (sid) => {
      transports.set(sid, transport);
    },
  });
  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const mcpServer = createMCPServer(token, baseURL);
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, body);
}

const httpServer = createServer((req, res) => {
  handleHttpRequest(req, res).catch((error) => {
    console.error('Request handling error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
});

httpServer.listen(port, host, () => {
  console.log(`Yuque MCP Server running on http://${host}:${port}`);
});
