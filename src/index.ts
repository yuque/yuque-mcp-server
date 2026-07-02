import { createServer as createMCPServer } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MISSING_TOKEN_MESSAGE, resolveYuqueBaseURL, resolveYuqueToken } from './config.js';

const token = resolveYuqueToken();

if (!token) {
  console.error(MISSING_TOKEN_MESSAGE);
  process.exit(1);
}

const baseURL = resolveYuqueBaseURL();

const mcpServer = createMCPServer(token, baseURL);
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

mcpServer
  .connect(transport)
  .then(() => {
    const port = Number(process.env.PORT) || 3000;
    const httpServer = createServer((req, res) => {
      transport.handleRequest(req, res).catch((error) => {
        console.error('Request handling error:', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
    });

    httpServer.listen(port, () => {
      console.log(`Yuque MCP Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
