import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookTools } from '../../src/tools/book.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  listUserRepos: vi.fn(),
  getRepo: vi.fn(),
  createUserRepo: vi.fn(),
  updateRepo: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

const mockRepo = { id: 1, slug: 'book', name: 'Book', namespace: 'user/book', description: '', public: 1, items_count: 5 };

describe('bookTools', () => {
  describe('yuque_list_books', () => {
    it('should list user books', async () => {
      (mockClient.listUserRepos as ReturnType<typeof vi.fn>).mockResolvedValue([mockRepo]);
      const result = await bookTools.yuque_list_books.handler(mockClient, { login: 'user' } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(mockClient.listUserRepos).toHaveBeenCalledWith('user');
    });
  });

  describe('yuque_get_book', () => {
    it('should get book by id', async () => {
      (mockClient.getRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      const result = await bookTools.yuque_get_book.handler(mockClient, { repo_id: 1 } as never);
      expect(JSON.parse(result.content[0].text)).toHaveProperty('name', 'Book');
    });

    it('should get book by namespace', async () => {
      (mockClient.getRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      await bookTools.yuque_get_book.handler(mockClient, { repo_id: 'user/book' } as never);
      expect(mockClient.getRepo).toHaveBeenCalledWith('user/book');
    });
  });

  describe('yuque_create_book', () => {
    it('should create user book', async () => {
      (mockClient.createUserRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      await bookTools.yuque_create_book.handler(mockClient, {
        login: 'user', name: 'Book', slug: 'book',
      } as never);
      expect(mockClient.createUserRepo).toHaveBeenCalledWith('user', expect.objectContaining({ name: 'Book', slug: 'book' }));
    });
  });

  describe('yuque_update_book', () => {
    it('should update book', async () => {
      (mockClient.updateRepo as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      await bookTools.yuque_update_book.handler(mockClient, { repo_id: 1, name: 'Updated' } as never);
      expect(mockClient.updateRepo).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated' }));
    });
  });
});
