import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repoTools } from '../../src/tools/repo.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  listUserRepos: vi.fn(),
  getRepo: vi.fn(),
  createUserRepo: vi.fn(),
  updateRepo: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

const mockRepo = { id: 1, slug: 'repo', name: 'Repo', namespace: 'user/repo', description: '', public: 1, items_count: 5 };

describe('repoTools', () => {
  describe('yuque_list_repos', () => {
    it('should list user repos', async () => {
      (mockClient.listUserRepos as ReturnType<typeof vi.fn>).mockResolvedValue([mockRepo]);
      const result = await repoTools.yuque_list_repos.handler(mockClient, { login: 'user' } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(mockClient.listUserRepos).toHaveBeenCalledWith('user');
    });
  });

  describe('yuque_get_repo', () => {
    it('should get repo by id', async () => {
      (mockClient.getRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      const result = await repoTools.yuque_get_repo.handler(mockClient, { id_or_namespace: 1 } as never);
      expect(JSON.parse(result.content[0].text)).toHaveProperty('name', 'Repo');
    });

    it('should get repo by namespace', async () => {
      (mockClient.getRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      await repoTools.yuque_get_repo.handler(mockClient, { id_or_namespace: 'user/repo' } as never);
      expect(mockClient.getRepo).toHaveBeenCalledWith('user/repo');
    });
  });

  describe('yuque_create_repo', () => {
    it('should create user repo', async () => {
      (mockClient.createUserRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      await repoTools.yuque_create_repo.handler(mockClient, {
        login: 'user', name: 'Repo', slug: 'repo',
      } as never);
      expect(mockClient.createUserRepo).toHaveBeenCalledWith('user', expect.objectContaining({ name: 'Repo', slug: 'repo' }));
    });
  });

  describe('yuque_update_repo', () => {
    it('should update repo', async () => {
      (mockClient.updateRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      await repoTools.yuque_update_repo.handler(mockClient, { id_or_namespace: 1, name: 'Updated' } as never);
      expect(mockClient.updateRepo).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated' }));
    });
  });
});
