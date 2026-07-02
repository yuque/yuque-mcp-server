import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YuqueClient } from '../../src/services/yuque-client.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('YuqueClient', () => {
  let client: YuqueClient;
  const mockToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as never);
    client = new YuqueClient(mockToken);
  });

  describe('constructor', () => {
    it('should use default base URL when not provided', () => {
      new YuqueClient(mockToken);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://www.yuque.com/api/v2',
        })
      );
    });

    it('should use custom base URL when provided', () => {
      const customURL = 'https://yuque.internal.com/api/v2';
      new YuqueClient(mockToken, customURL);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: customURL,
        })
      );
    });
  });

  describe('getUser', () => {
    it('should fetch user data', async () => {
      const mockUser = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        description: 'Test description',
        avatar_url: 'https://example.com/avatar.png',
        books_count: 5,
        followers_count: 10,
      };

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockUser } });

      const result = await client.getUser();
      expect(result).toEqual(mockUser);
      expect(mockClient.get).toHaveBeenCalledWith('/user');
    });
  });

  describe('search', () => {
    it('should search with query', async () => {
      const mockResult = {
        items: [
          {
            id: 1,
            type: 'doc',
            title: 'Test Doc',
            url: 'https://example.com/doc',
            body: 'Test content',
            created_at: '2024-01-01',
            updated_at: '2024-01-02',
          },
        ],
        total: 1,
      };

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockResult } });

      const result = await client.search('test query');
      expect(result).toEqual(mockResult);
      expect(mockClient.get).toHaveBeenCalledWith('/search', {
        params: { q: 'test query' },
      });
    });

    it('should search with type filter', async () => {
      const mockResult = { items: [], total: 0 };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockResult } });

      await client.search('test', 'doc');
      expect(mockClient.get).toHaveBeenCalledWith('/search', {
        params: { q: 'test', type: 'doc' },
      });
    });
  });

  describe('repo operations', () => {
    it('should list groups for a user', async () => {
      const mockGroups = [{ id: 1, login: 'team', name: 'Team' }];
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockGroups } });

      const result = await client.listGroups(123);
      expect(result).toEqual(mockGroups);
      expect(mockClient.get).toHaveBeenCalledWith('/users/123/groups');
    });

    it('should list user repos', async () => {
      const mockRepos = [
        {
          id: 1,
          slug: 'test-repo',
          name: 'Test Repo',
          namespace: 'user/test-repo',
          description: 'Test',
          public: 1,
          items_count: 5,
        },
      ];

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockRepos } });

      const result = await client.listUserRepos('testuser');
      expect(result).toEqual(mockRepos);
      expect(mockClient.get).toHaveBeenCalledWith('/users/testuser/repos');
    });

    it('should list group repos', async () => {
      const mockRepos = [{ id: 1, name: 'Group Repo' }];
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockRepos } });

      const result = await client.listGroupRepos('team');
      expect(result).toEqual(mockRepos);
      expect(mockClient.get).toHaveBeenCalledWith('/groups/team/repos');
    });

    it('should get repo by ID', async () => {
      const mockRepo = {
        id: 1,
        slug: 'test-repo',
        name: 'Test Repo',
        namespace: 'user/test-repo',
      };

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockRepo } });

      const result = await client.getRepo(1);
      expect(result).toEqual(mockRepo);
      expect(mockClient.get).toHaveBeenCalledWith('/repos/1');
    });

    it('should get repo by namespace', async () => {
      const mockRepo = {
        id: 1,
        slug: 'test-repo',
        name: 'Test Repo',
        namespace: 'user/test-repo',
      };

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockRepo } });

      const result = await client.getRepo('user/test-repo');
      expect(result).toEqual(mockRepo);
      expect(mockClient.get).toHaveBeenCalledWith('/repos/user/test-repo');
    });

    it('should create user repo', async () => {
      const mockRepo = { id: 1, name: 'New Repo', slug: 'new-repo' };
      const mockClient = client['client'] as { post: ReturnType<typeof vi.fn> };
      mockClient.post.mockResolvedValue({ data: { data: mockRepo } });

      const result = await client.createUserRepo('testuser', {
        name: 'New Repo',
        slug: 'new-repo',
      });
      expect(result).toEqual(mockRepo);
      expect(mockClient.post).toHaveBeenCalledWith('/users/testuser/repos', {
        name: 'New Repo',
        slug: 'new-repo',
      });
    });

    it('should create group repo', async () => {
      const mockRepo = { id: 2, name: 'Group Repo', slug: 'group-repo' };
      const mockClient = client['client'] as { post: ReturnType<typeof vi.fn> };
      mockClient.post.mockResolvedValue({ data: { data: mockRepo } });

      const result = await client.createGroupRepo('team', {
        name: 'Group Repo',
        slug: 'group-repo',
      });
      expect(result).toEqual(mockRepo);
      expect(mockClient.post).toHaveBeenCalledWith('/groups/team/repos', {
        name: 'Group Repo',
        slug: 'group-repo',
      });
    });

    it('should update repo', async () => {
      const mockRepo = { id: 1, name: 'Updated Repo' };
      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: mockRepo } });

      const result = await client.updateRepo('team/repo', { name: 'Updated Repo' });
      expect(result).toEqual(mockRepo);
      expect(mockClient.put).toHaveBeenCalledWith('/repos/team/repo', { name: 'Updated Repo' });
    });

    it('should delete repo', async () => {
      const mockClient = client['client'] as { delete: ReturnType<typeof vi.fn> };
      mockClient.delete.mockResolvedValue({});

      await client.deleteRepo(1);
      expect(mockClient.delete).toHaveBeenCalledWith('/repos/1');
    });
  });

  describe('doc operations', () => {
    it('should list docs', async () => {
      const mockDocs = [
        {
          id: 1,
          slug: 'test-doc',
          title: 'Test Doc',
          format: 'markdown',
          body: 'Test content',
        },
      ];

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockDocs } });

      const result = await client.listDocs(1);
      expect(result).toEqual(mockDocs);
      expect(mockClient.get).toHaveBeenCalledWith('/repos/1/docs');
    });

    it('should get doc', async () => {
      const mockDoc = {
        id: 1,
        slug: 'test-doc',
        title: 'Test Doc',
        body: 'Test content',
      };

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockDoc } });

      const result = await client.getDoc(1, 1);
      expect(result).toEqual(mockDoc);
      expect(mockClient.get).toHaveBeenCalledWith('/repos/1/docs/1');
    });

    it('should get YMD doc content', async () => {
      const mockYmdDoc = {
        doc_id: 1,
        title: 'Test Doc',
        url: '/user/repo/test-doc',
        yfm: '# Test Doc',
        updated_at: '2024-01-02',
      };

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockYmdDoc } });

      const result = await client.getYmdDoc(1);
      expect(result).toEqual(mockYmdDoc);
      expect(mockClient.get).toHaveBeenCalledWith('/yfm/docs', {
        params: { doc_id: 1 },
      });
    });

    it('should create doc', async () => {
      const mockDoc = { id: 1, title: 'New Doc', body: 'Content' };
      const mockClient = client['client'] as { post: ReturnType<typeof vi.fn> };
      mockClient.post.mockResolvedValue({ data: { data: mockDoc } });

      const result = await client.createDoc(1, {
        title: 'New Doc',
        body: 'Content',
      });
      expect(result).toEqual(mockDoc);
      expect(mockClient.post).toHaveBeenCalledWith('/repos/1/docs', {
        title: 'New Doc',
        body: 'Content',
      });
    });

    it('should update doc', async () => {
      const mockDoc = { id: 1, title: 'Updated Doc' };
      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: mockDoc } });

      const result = await client.updateDoc(1, 1, { title: 'Updated Doc' });
      expect(result).toEqual(mockDoc);
      expect(mockClient.put).toHaveBeenCalledWith('/repos/1/docs/1', {
        title: 'Updated Doc',
      });
    });

    it('should update YMD doc content', async () => {
      const mockResult = {
        doc_id: 1,
        title: 'Updated Doc',
        url: '/user/repo/test-doc',
        updated_at: '2024-01-03',
      };

      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: mockResult } });

      const result = await client.updateYmdDoc(1, '# Updated Doc');
      expect(result).toEqual(mockResult);
      expect(mockClient.put).toHaveBeenCalledWith('/yfm/docs', {
        doc_id: 1,
        yfm: '# Updated Doc',
      });
    });

    it('should get resource detail without forwarding resource_type', async () => {
      const mockResult = {
        doc_id: 1,
        title: 'Test Doc',
        url: '/user/repo/test-doc',
        updated_at: '2024-01-03',
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

      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockResult } });

      const result = await client.getResource({
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
      });
      expect(result).toEqual(mockResult);
      expect(mockClient.get).toHaveBeenCalledWith('/yfm/boards', {
        params: { doc_id: 1, src: 'board-1' },
      });
    });

    it('should create resource without forwarding resource_type or undefined fields', async () => {
      const mockResult = {
        doc_id: 1,
        title: 'Test Doc',
        url: '/user/repo/test-doc',
        updated_at: '2024-01-03',
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

      const mockClient = client['client'] as { post: ReturnType<typeof vi.fn> };
      mockClient.post.mockResolvedValue({ data: { data: mockResult } });

      const result = await client.createResource({
        resource_type: 'board',
        doc_id: 1,
        type: 'mindmap',
        dsl: '- root',
      });
      expect(result).toEqual(mockResult);
      expect(mockClient.post).toHaveBeenCalledWith('/yfm/boards', {
        doc_id: 1,
        type: 'mindmap',
        dsl: '- root',
      });
    });

    it('should update resource with JSON DSL body', async () => {
      const nextDsl = {
        value: {
          diagramData: {
            body: [],
          },
        },
        format: 'json',
        language: 'json',
      };
      const mockResult = {
        doc_id: 1,
        title: 'Test Doc',
        url: '/user/repo/test-doc',
        updated_at: '2024-01-03',
        board: {
          page_ref: { src: 'board://board-1' },
          resource: { id: 'board-1', kind: 'flowchart' },
          dsl: nextDsl,
          summary: {
            cell_count: 0,
            type_counts: {},
            shape_counts: {},
            has_viewport: false,
            has_search: false,
          },
        },
      };

      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: mockResult } });

      const result = await client.updateResource({
        resource_type: 'board',
        url: 'https://www.yuque.com/user/repo/doc',
        resource_id: 'board-1',
        dsl: nextDsl,
      });
      expect(result).toEqual(mockResult);
      expect(mockClient.put).toHaveBeenCalledWith('/yfm/boards', {
        url: 'https://www.yuque.com/user/repo/doc',
        src: 'board-1',
        dsl: nextDsl,
      });
    });

    it('should delete doc', async () => {
      const mockClient = client['client'] as { delete: ReturnType<typeof vi.fn> };
      mockClient.delete.mockResolvedValue({});

      await client.deleteDoc(1, 1);
      expect(mockClient.delete).toHaveBeenCalledWith('/repos/1/docs/1');
    });
  });

  describe('toc operations', () => {
    it('should get toc', async () => {
      const mockToc = [{ title: 'Intro', uuid: 'u1', doc_id: 1 }];
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockToc } });

      const result = await client.getToc('team/repo');
      expect(result).toEqual(mockToc);
      expect(mockClient.get).toHaveBeenCalledWith('/repos/team/repo/toc');
    });

    it('should update toc', async () => {
      const mockToc = [{ title: 'Intro', uuid: 'u1', doc_id: 1 }];
      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: mockToc } });

      const result = await client.updateToc(1, '{"action":"appendNode"}');
      expect(result).toEqual(mockToc);
      expect(mockClient.put).toHaveBeenCalledWith('/repos/1/toc', '{"action":"appendNode"}');
    });
  });

  describe('doc version operations', () => {
    it('should list doc versions', async () => {
      const mockVersions = [{ id: 1, doc_id: 2, title: 'v1' }];
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockVersions } });

      const result = await client.listDocVersions(2);
      expect(result).toEqual(mockVersions);
      expect(mockClient.get).toHaveBeenCalledWith('/doc_versions', {
        params: { doc_id: 2 },
      });
    });

    it('should get a doc version', async () => {
      const mockVersion = { id: 9, doc_id: 2, title: 'v9' };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockVersion } });

      const result = await client.getDocVersion(9);
      expect(result).toEqual(mockVersion);
      expect(mockClient.get).toHaveBeenCalledWith('/doc_versions/9');
    });
  });

  describe('group member and statistics operations', () => {
    it('should list group members', async () => {
      const mockMembers = [{ id: 1, login: 'member' }];
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockMembers } });

      const result = await client.listGroupMembers('team');
      expect(result).toEqual(mockMembers);
      expect(mockClient.get).toHaveBeenCalledWith('/groups/team/users');
    });

    it('should update group member role', async () => {
      const mockMember = { id: 1, role: 2 };
      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: mockMember } });

      const result = await client.updateGroupMember('team', 1, { role: 2 });
      expect(result).toEqual(mockMember);
      expect(mockClient.put).toHaveBeenCalledWith('/groups/team/users/1', { role: 2 });
    });

    it('should remove group member', async () => {
      const mockClient = client['client'] as { delete: ReturnType<typeof vi.fn> };
      mockClient.delete.mockResolvedValue({});

      await client.removeGroupMember('team', 1);
      expect(mockClient.delete).toHaveBeenCalledWith('/groups/team/users/1');
    });

    it('should get group statistics', async () => {
      const mockStats = { books_count: 3, docs_count: 10 };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockStats } });

      const result = await client.getGroupStats('team');
      expect(result).toEqual(mockStats);
      expect(mockClient.get).toHaveBeenCalledWith('/groups/team/statistics');
    });

    it.each([
      ['member', () => client.getGroupMemberStats('team'), '/groups/team/statistics/members'],
      ['book', () => client.getGroupBookStats('team'), '/groups/team/statistics/books'],
      ['doc', () => client.getGroupDocStats('team'), '/groups/team/statistics/docs'],
    ])('should get %s statistics', async (_label, call, path) => {
      const mockStats = { total: 1 };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockStats } });

      const result = await call();
      expect(result).toEqual(mockStats);
      expect(mockClient.get).toHaveBeenCalledWith(path);
    });
  });

  describe('hello and note operations', () => {
    it('should call hello', async () => {
      const mockMessage = { message: 'ok' };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockMessage } });

      const result = await client.hello();
      expect(result).toEqual(mockMessage);
      expect(mockClient.get).toHaveBeenCalledWith('/hello');
    });

    it('should list notes with params', async () => {
      const mockNotes = { notes: [], pin_notes: [], has_more: false };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockNotes } });

      const result = await client.listNotes(0, 2, 20);
      expect(result).toEqual(mockNotes);
      expect(mockClient.get).toHaveBeenCalledWith('/notes', {
        params: { status: 0, page: 2, limit: 20 },
      });
    });

    it('should get note', async () => {
      const mockNote = { id: 1, content: { source: 'note' } };
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockResolvedValue({ data: { data: mockNote } });

      const result = await client.getNote(1);
      expect(result).toEqual(mockNote);
      expect(mockClient.get).toHaveBeenCalledWith('/notes/1');
    });

    it('should create note', async () => {
      const mockNote = { id: 1, slug: 'note' };
      const mockClient = client['client'] as { post: ReturnType<typeof vi.fn> };
      mockClient.post.mockResolvedValue({ data: { data: mockNote } });

      const result = await client.createNote({ body: 'hello' });
      expect(result).toEqual(mockNote);
      expect(mockClient.post).toHaveBeenCalledWith('/notes', { body: 'hello' });
    });

    it('should update note', async () => {
      const mockNote = { id: 1, content: { source: 'updated' } };
      const mockClient = client['client'] as { put: ReturnType<typeof vi.fn> };
      mockClient.put.mockResolvedValue({ data: { data: { data: mockNote } } });

      const result = await client.updateNote(1, {
        source: 'updated',
        html: '<p>updated</p>',
        abstract: 'updated',
      });
      expect(result).toEqual(mockNote);
      expect(mockClient.put).toHaveBeenCalledWith('/notes/1', {
        source: 'updated',
        html: '<p>updated</p>',
        abstract: 'updated',
      });
    });

    it('should delete note by moving it to trash', async () => {
      const mockClient = client['client'] as {
        get: ReturnType<typeof vi.fn>;
        put: ReturnType<typeof vi.fn>;
      };
      mockClient.get.mockResolvedValue({
        data: {
          data: {
            id: 1,
            content: {
              source: 'source',
              html: '<p>source</p>',
              abstract: 'source',
            },
          },
        },
      });
      mockClient.put.mockResolvedValue({ data: { data: { data: { id: 1 } } } });

      await client.deleteNote(1);
      expect(mockClient.put).toHaveBeenCalledWith('/notes/1', {
        source: 'source',
        html: '<p>source</p>',
        abstract: 'source',
        status: 9,
      });
    });

    it('should restore note from trash', async () => {
      const mockClient = client['client'] as {
        get: ReturnType<typeof vi.fn>;
        put: ReturnType<typeof vi.fn>;
      };
      mockClient.get.mockResolvedValue({
        data: {
          data: {
            id: 1,
            content: {},
          },
        },
      });
      mockClient.put.mockResolvedValue({ data: { data: { data: { id: 1 } } } });

      await client.restoreNote(1);
      expect(mockClient.put).toHaveBeenCalledWith('/notes/1', {
        source: '',
        html: '',
        abstract: '',
        status: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should normalize rejected API errors', async () => {
      const mockClient = client['client'] as { get: ReturnType<typeof vi.fn> };
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Missing' },
        },
      });

      await expect(client.getUser()).rejects.toThrow('Missing');
      await expect(client.getUser()).rejects.toThrow('Not found');
    });
  });
});
