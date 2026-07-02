import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server.js';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

const realApiEnabled = process.env.YUQUE_REAL_API === '1';
const repoId = process.env.YUQUE_REAL_REPO_ID;
const noteId = process.env.YUQUE_REAL_WRITE_NOTE_ID;
const writeEnabled = realApiEnabled && process.env.YUQUE_REAL_WRITE === '1' && noteId;
const token = process.env.YUQUE_PERSONAL_TOKEN ?? process.env.YUQUE_MCP_TEST_TOKEN;

function getRequestHandler<T>(server: unknown, method: string) {
  return (
    server as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<T>>;
    }
  )._requestHandlers.get(method);
}

async function callRealTool(name: string, args: Record<string, unknown>) {
  if (!token) {
    throw new Error(
      'YUQUE_PERSONAL_TOKEN or YUQUE_MCP_TEST_TOKEN is required for real API smoke tests'
    );
  }
  const server = createServer(token, process.env.YUQUE_BASE_URL);
  const handler = getRequestHandler<ToolResult>(server, 'tools/call');
  if (!handler) throw new Error('tools/call handler missing');

  return handler(
    {
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    },
    {}
  );
}

function parseJson(result: ToolResult) {
  expect(result.isError).toBeUndefined();
  return JSON.parse(result.content[0].text);
}

const describeRealApi = realApiEnabled ? describe : describe.skip;
const itWithRepo = realApiEnabled && repoId ? it : it.skip;
const itWithWriteNote = writeEnabled ? it : it.skip;

describeRealApi('real Yuque API smoke through MCP tools/call', () => {
  it('should read the authenticated user', async () => {
    const result = await callRealTool('yuque_get_user', {});
    const user = parseJson(result);

    expect(user.id).toBeDefined();
    expect(user.login || user.name).toBeTruthy();
  });

  itWithRepo('should list docs from the configured real repo', async () => {
    const result = await callRealTool('yuque_list_docs', { repo_id: repoId });
    const docs = parseJson(result);

    expect(Array.isArray(docs)).toBe(true);
  });

  itWithWriteNote('should update a scratch note and read it back', async () => {
    const numericNoteId = Number(noteId);
    const original = parseJson(await callRealTool('yuque_get_note', { note_id: numericNoteId }));
    const originalBody = original.content?.text ?? '';
    const nextBody = `yuque-mcp real-api smoke ${new Date().toISOString()}`;

    try {
      await callRealTool('yuque_update_note', {
        note_id: numericNoteId,
        body: nextBody,
      });

      const updated = parseJson(await callRealTool('yuque_get_note', { note_id: numericNoteId }));
      expect(updated.content.text).toBe(nextBody);
    } finally {
      await callRealTool('yuque_update_note', {
        note_id: numericNoteId,
        body: originalBody,
      });
    }
  });
});
