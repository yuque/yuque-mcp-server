import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userTools } from '../../src/tools/user.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  getUser: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

describe('userTools', () => {
  describe('yuque_get_user', () => {
    it('should return formatted user', async () => {
      (mockClient.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1, type: 'User', login: 'test', name: 'Test', description: '',
        avatar_url: '', books_count: 5, followers_count: 10,
      });
      const result = await userTools.yuque_get_user.handler(mockClient, {} as never);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('login', 'test');
      expect(mockClient.getUser).toHaveBeenCalledOnce();
    });
  });
});
