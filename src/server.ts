import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { YuqueClient } from './services/yuque-client.js';
import { userTools } from './tools/user.js';
import { repoTools } from './tools/repo.js';
import { docTools } from './tools/doc.js';
import { tocTools } from './tools/toc.js';
import { searchTools } from './tools/search.js';
import { groupTools } from './tools/group.js';
import { statsTools } from './tools/stats.js';
import { versionTools } from './tools/version.js';
import { noteTools } from './tools/note.js';

export function createServer(token: string) {
  const client = new YuqueClient(token);
  const server = new Server(
    {
      name: 'yuque-mcp',
      version: '0.1.2',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Combine all tools
  const allTools = {
    ...userTools,
    ...repoTools,
    ...docTools,
    ...tocTools,
    ...searchTools,
    ...groupTools,
    ...statsTools,
    ...versionTools,
    ...noteTools,
  };

  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(allTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    };
  });

  // Register call_tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = allTools[toolName as keyof typeof allTools];

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      // Validate arguments with zod
      const args = tool.inputSchema.parse(request.params.arguments);
      // Call the tool handler
      return await tool.handler(client, args as never);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Tool execution failed: ${error.message}`);
      }
      throw error;
    }
  });

  return server;
}

export async function runStdioServer(token: string) {
  const server = createServer(token);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Yuque MCP Server running on stdio');
}
