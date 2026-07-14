import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server.js';

type ToolSchema = {
  type?: string;
  properties?: Record<string, { type?: unknown; enum?: unknown[]; default?: unknown }>;
  required?: string[];
  additionalProperties?: boolean;
};

type ListedTool = {
  name: string;
  description: string;
  inputSchema: ToolSchema;
};

const expectedToolNames = [
  'yuque_get_user',
  'yuque_list_books',
  'yuque_get_book',
  'yuque_create_book',
  'yuque_update_book',
  'yuque_list_docs',
  'yuque_get_doc',
  'yuque_create_doc',
  'yuque_update_doc',
  'yuque_get_toc',
  'yuque_update_toc',
  'yuque_search',
  'yuque_list_notes',
  'yuque_get_note',
  'yuque_create_note',
  'yuque_update_note',
  'yuque_get_resource',
  'yuque_create_resource',
  'yuque_update_resource',
].sort();

const requiredFieldsByTool: Record<string, string[]> = {
  yuque_get_user: [],
  yuque_list_books: [],
  yuque_get_book: ['repo_id'],
  yuque_create_book: ['login', 'name', 'slug'],
  yuque_update_book: ['repo_id'],
  yuque_list_docs: ['repo_id'],
  yuque_get_doc: ['repo_id', 'doc_id'],
  yuque_create_doc: ['repo_id', 'title'],
  yuque_update_doc: ['repo_id', 'doc_id'],
  yuque_get_toc: ['repo_id'],
  yuque_update_toc: ['repo_id', 'toc_data'],
  yuque_search: ['query', 'type'],
  yuque_list_notes: [],
  yuque_get_note: ['note_id'],
  yuque_create_note: ['body'],
  yuque_update_note: ['note_id', 'body'],
  yuque_get_resource: ['resource_type', 'resource_id'],
  yuque_create_resource: ['resource_type', 'type', 'dsl'],
  yuque_update_resource: ['resource_type', 'resource_id'],
};

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

async function listTools() {
  const server = createServer('test-token');
  const handler = getListToolsHandler(server);
  if (!handler) throw new Error('tools/list handler missing');
  return handler({ method: 'tools/list', params: {} }, {});
}

describe('MCP tool registry contract', () => {
  it('should expose the complete supported tool surface', async () => {
    const result = await listTools();

    expect(
      result.tools.map((tool) => tool.name).sort(),
      'The registered tool surface diverged from the pinned contract. If this change is intentional: update expectedToolNames and requiredFieldsByTool in this file, cover the tool in tests/mcp/tool-call-contract.test.ts, and update docs/capability-scope.md. If not intentional: you broke the public MCP surface — restore the registration in src/tools/ and src/server.ts.'
    ).toEqual(expectedToolNames);
  });

  it('should expose JSON-schema input contracts for every tool', async () => {
    const result = await listTools();

    for (const tool of result.tools) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(Object.keys(tool.inputSchema.properties ?? {})).toEqual(
        expect.arrayContaining(requiredFieldsByTool[tool.name])
      );
      expect(
        (tool.inputSchema.required ?? []).sort(),
        `Required parameters of ${tool.name} diverged from the pinned contract. Changing required params is a breaking change for every MCP client. If intentional: update requiredFieldsByTool in this file and docs/capability-scope.md, and state the breaking change in the PR description.`
      ).toEqual(requiredFieldsByTool[tool.name].sort());
    }
  });

  it('should preserve enum/default constraints that AI clients rely on', async () => {
    // On failure: if the enum/default change is intentional, update the assertion
    // here AND the documented enums in docs/capability-scope.md; removing or
    // renaming enum values is a breaking change and must be stated in the PR.
    const result = await listTools();
    const byName = Object.fromEntries(result.tools.map((tool) => [tool.name, tool]));

    expect(byName.yuque_search.inputSchema.properties?.type.enum).toEqual(['doc', 'repo']);
    expect(byName.yuque_get_doc.inputSchema.properties?.format.enum).toEqual([
      'markdown',
      'lake',
      'html',
    ]);
    expect(byName.yuque_get_doc.inputSchema.properties?.include_lake.default).toBe(false);
    expect(byName.yuque_update_doc.inputSchema.properties?.format.enum).toEqual([
      'markdown',
      'lake',
      'html',
    ]);
    expect(byName.yuque_get_resource.inputSchema.properties?.resource_type.enum).toEqual(['board']);
    expect(byName.yuque_create_resource.inputSchema.properties?.type.enum).toEqual([
      'mindmap',
      'flowchart',
      'architecturediagram',
    ]);
  });
});
