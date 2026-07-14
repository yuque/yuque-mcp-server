import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { createServer } from '../../src/server.js';

vi.mock('axios');

type MockHttpClient = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

type ToolCase = {
  name: string;
  args: Record<string, unknown>;
  setup: (http: MockHttpClient) => void;
  assert: (http: MockHttpClient, result: ToolResult) => void;
};

const mockedAxios = vi.mocked(axios, true);

function apiResponse<T>(data: T) {
  return Promise.resolve({ data: { data } });
}

function nestedNoteResponse<T>(data: T) {
  return Promise.resolve({ data: { data: { data } } });
}

function getRequestHandler<T>(server: unknown, method: string) {
  return (
    server as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<T>>;
    }
  )._requestHandlers.get(method);
}

async function callTool(name: string, args: Record<string, unknown>) {
  const server = createServer('test-token', 'https://yuque.internal/api/v2');
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

function sampleRepo(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: 'book',
    name: 'Book',
    namespace: 'user/book',
    description: 'Book description',
    public: 1,
    items_count: 3,
    updated_at: '2024-01-02',
    ...overrides,
  };
}

function sampleDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    slug: 'doc',
    title: 'Doc',
    format: 'markdown',
    body: '# Doc',
    body_html: '<h1>Doc</h1>',
    public: 1,
    word_count: 2,
    updated_at: '2024-01-02',
    ...overrides,
  };
}

function sampleNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    slug: 'note',
    content: {
      source: 'Note source',
      abstract: 'Note abstract',
      html: '<p>Note source</p>',
    },
    word_count: 2,
    tags: [],
    created_at: '2024-02-01',
    updated_at: '2024-02-02',
    published_at: '2024-02-03',
    pinned_at: null,
    likes_count: 1,
    comments_count: 0,
    status: 0,
    ...overrides,
  };
}

const boardResult = {
  doc_id: 2,
  title: 'Doc',
  url: '/user/book/doc',
  updated_at: '2024-03-01',
  board: {
    page_ref: { src: 'board://board-1' },
    resource: { id: 'board-1', kind: 'mindmap' },
    dsl: { text: '- root', format: 'text', language: 'mindmap' },
    summary: {
      cell_count: 1,
      type_counts: {},
      shape_counts: {},
      has_viewport: false,
      has_search: false,
    },
  },
};

const toolCases: ToolCase[] = [
  {
    name: 'yuque_get_user',
    args: {},
    setup: (http) => {
      http.get.mockReturnValue(apiResponse({ id: 1, login: 'tester', name: 'Tester' }));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ id: 1, login: 'tester' });
      expect(http.get).toHaveBeenCalledWith('/user');
    },
  },
  {
    name: 'yuque_search',
    args: { query: 'release notes', type: 'doc' },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse({ items: [{ id: 1, type: 'doc' }], total: 1 }));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ total: 1 });
      expect(http.get).toHaveBeenCalledWith('/search', {
        params: { q: 'release notes', type: 'doc' },
      });
    },
  },
  {
    name: 'yuque_list_books',
    args: { login: 'tester' },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse([sampleRepo()]));
    },
    assert: (http, result) => {
      expect(parseJson(result)[0]).toMatchObject({ namespace: 'user/book', public: true });
      expect(http.get).toHaveBeenCalledWith('/users/tester/repos', { params: {} });
    },
  },
  {
    name: 'yuque_get_book',
    args: { repo_id: 'user/book' },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse(sampleRepo()));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ name: 'Book' });
      expect(http.get).toHaveBeenCalledWith('/repos/user/book');
    },
  },
  {
    name: 'yuque_create_book',
    args: { login: 'tester', name: 'Book', slug: 'book', description: 'Created', public: 1 },
    setup: (http) => {
      http.post.mockReturnValue(apiResponse(sampleRepo({ description: 'Created' })));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ description: 'Created' });
      expect(http.post).toHaveBeenCalledWith(
        '/users/tester/repos',
        expect.objectContaining({ name: 'Book', slug: 'book', description: 'Created', public: 1 })
      );
    },
  },
  {
    name: 'yuque_update_book',
    args: { repo_id: 1, name: 'Renamed' },
    setup: (http) => {
      http.put.mockReturnValue(apiResponse(sampleRepo({ name: 'Renamed' })));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ name: 'Renamed' });
      expect(http.put).toHaveBeenCalledWith(
        '/repos/1',
        expect.objectContaining({ name: 'Renamed' })
      );
    },
  },
  {
    name: 'yuque_list_docs',
    args: { repo_id: 1 },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse([sampleDoc()]));
    },
    assert: (http, result) => {
      expect(parseJson(result)[0]).toMatchObject({ title: 'Doc' });
      expect(http.get).toHaveBeenCalledWith('/repos/1/docs', { params: {} });
    },
  },
  {
    name: 'yuque_get_doc',
    args: { repo_id: 1, doc_id: 2, format: 'lake', include_lake: false },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse(sampleDoc({ format: 'lake' })));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ body: '# Doc', format: 'lake' });
      expect(http.get).toHaveBeenCalledWith('/repos/1/docs/2');
    },
  },
  {
    name: 'yuque_create_doc',
    args: { repo_id: 1, title: 'New Doc', body: '# New Doc', format: 'markdown' },
    setup: (http) => {
      http.post.mockReturnValue(apiResponse(sampleDoc({ id: 3, title: 'New Doc' })));
      http.put.mockReturnValue(apiResponse([]));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ id: 3, title: 'New Doc' });
      expect(http.post).toHaveBeenCalledWith(
        '/repos/1/docs',
        expect.objectContaining({ title: 'New Doc', body: '# New Doc', format: 'markdown' })
      );
      expect(http.put).toHaveBeenCalledWith('/repos/1/toc', expect.stringContaining('"doc_id":3'));
    },
  },
  {
    name: 'yuque_update_doc',
    args: { repo_id: 1, doc_id: 2, body: '<p>Lake</p>', format: 'lake' },
    setup: (http) => {
      http.put.mockReturnValue(apiResponse(sampleDoc({ body: '<p>Lake</p>', format: 'lake' })));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ body: '<p>Lake</p>', format: 'lake' });
      expect(http.put).toHaveBeenCalledWith(
        '/repos/1/docs/2',
        expect.objectContaining({ body: '<p>Lake</p>', format: 'lake' })
      );
    },
  },
  {
    name: 'yuque_get_toc',
    args: { repo_id: 1 },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse([{ title: 'Intro', uuid: 'u1', doc_id: 2, level: 0 }]));
    },
    assert: (http, result) => {
      expect(parseJson(result)[0]).toMatchObject({ title: 'Intro', visible: false });
      expect(http.get).toHaveBeenCalledWith('/repos/1/toc');
    },
  },
  {
    name: 'yuque_update_toc',
    args: { repo_id: 1, toc_data: '{"action":"appendNode"}' },
    setup: (http) => {
      http.put.mockReturnValue(
        apiResponse([{ title: 'Updated', uuid: 'u2', doc_id: 3, level: 0, visible: 1 }])
      );
    },
    assert: (http, result) => {
      expect(parseJson(result)[0]).toMatchObject({ title: 'Updated', visible: true });
      expect(http.put).toHaveBeenCalledWith('/repos/1/toc', '{"action":"appendNode"}');
    },
  },
  {
    name: 'yuque_list_notes',
    args: { status: 0, page: 1, limit: 20 },
    setup: (http) => {
      http.get.mockReturnValue(
        apiResponse({ pin_notes: [], notes: [sampleNote()], has_more: false })
      );
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ total: 1, pinned: 0 });
      expect(http.get).toHaveBeenCalledWith('/notes', {
        params: { status: 0, page: 1, limit: 20 },
      });
    },
  },
  {
    name: 'yuque_get_note',
    args: { note_id: 9 },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse(sampleNote()));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ id: 9, content: { text: 'Note source' } });
      expect(http.get).toHaveBeenCalledWith('/notes/9');
    },
  },
  {
    name: 'yuque_create_note',
    args: { body: 'New note' },
    setup: (http) => {
      http.post.mockReturnValue(
        apiResponse({ id: 10, slug: 'new-note', note_url: 'https://note' })
      );
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ success: true, id: 10 });
      expect(http.post).toHaveBeenCalledWith('/notes', { body: 'New note' });
    },
  },
  {
    name: 'yuque_update_note',
    args: { note_id: 9, body: 'Updated note' },
    setup: (http) => {
      http.put.mockReturnValue(
        nestedNoteResponse(sampleNote({ content: { source: 'Updated note' } }))
      );
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ content: { text: 'Updated note' } });
      expect(http.put).toHaveBeenCalledWith('/notes/9', {
        source: 'Updated note',
        html: '<p>Updated note</p>',
        abstract: 'Updated note',
      });
    },
  },
  {
    name: 'yuque_get_resource',
    args: { resource_type: 'board', doc_id: 2, resource_id: 'board-1' },
    setup: (http) => {
      http.get.mockReturnValue(apiResponse(boardResult));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ board: { resource: { id: 'board-1' } } });
      expect(http.get).toHaveBeenCalledWith('/yfm/boards', {
        params: { doc_id: 2, src: 'board-1' },
      });
    },
  },
  {
    name: 'yuque_create_resource',
    args: { resource_type: 'board', doc_id: 2, type: 'mindmap', dsl: '- root' },
    setup: (http) => {
      http.post.mockReturnValue(apiResponse(boardResult));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ board: { resource: { kind: 'mindmap' } } });
      expect(http.post).toHaveBeenCalledWith('/yfm/boards', {
        doc_id: 2,
        type: 'mindmap',
        dsl: '- root',
      });
    },
  },
  {
    name: 'yuque_update_resource',
    args: { resource_type: 'board', doc_id: 2, resource_id: 'board-1', text: '- next' },
    setup: (http) => {
      http.put.mockReturnValue(apiResponse(boardResult));
    },
    assert: (http, result) => {
      expect(parseJson(result)).toMatchObject({ board: { resource: { id: 'board-1' } } });
      expect(http.put).toHaveBeenCalledWith('/yfm/boards', {
        doc_id: 2,
        src: 'board-1',
        text: '- next',
      });
    },
  },
];

describe('MCP tools/call contract', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    mockedAxios.create.mockReturnValue(http as never);
  });

  it('should cover every registered tool through the MCP call path', async () => {
    const server = createServer('test-token');
    const listHandler = getRequestHandler<{ tools: Array<{ name: string }> }>(server, 'tools/list');
    if (!listHandler) throw new Error('tools/list handler missing');
    const listed = await listHandler({ method: 'tools/list', params: {} }, {});

    expect(toolCases.map((testCase) => testCase.name).sort()).toEqual(
      listed.tools.map((tool) => tool.name).sort()
    );
  });

  it.each(toolCases)('should call $name through tools/call', async (testCase) => {
    testCase.setup(http);

    const result = await callTool(testCase.name, testCase.args);

    testCase.assert(http, result);
  });

  it('should map Yuque API errors into MCP tool errors', async () => {
    http.get.mockRejectedValue({
      response: {
        status: 404,
        data: { message: 'Doc missing' },
      },
    });

    const result = await callTool('yuque_get_user', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Doc missing');
    expect(result.content[0].text).toContain('Not found');
  });

  it('should reject invalid arguments before making an HTTP request', async () => {
    const result = await callTool('yuque_get_book', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Tool execution failed');
    expect(http.get).not.toHaveBeenCalled();
  });
});
