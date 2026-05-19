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
      const c = new YuqueClient(mockToken);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://www.yuque.com/api/v2',
        })
      );
    });

    it('should use custom base URL when provided', () => {
      const customURL = 'https://yuque.internal.com/api/v2';
      const c = new YuqueClient(mockToken, customURL);
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

    it('should delete doc', async () => {
      const mockClient = client['client'] as { delete: ReturnType<typeof vi.fn> };
      mockClient.delete.mockResolvedValue({});

      await client.deleteDoc(1, 1);
      expect(mockClient.delete).toHaveBeenCalledWith('/repos/1/docs/1');
    });
  });
});
