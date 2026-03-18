import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTools } from '../../src/tools/search.js';
import { tocTools } from '../../src/tools/toc.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  search: vi.fn(),
  getToc: vi.fn(),
  updateToc: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

describe('searchTools', () => {
  describe('yuque_search', () => {
    it('should search with query and type', async () => {
      (mockClient.search as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [{ id: 1, type: 'doc', title: 'Result' }], total: 1 });
      const result = await searchTools.yuque_search.handler(mockClient, { query: 'test', type: 'doc' } as never);
      expect(result.content[0].type).toBe('text');
      expect(mockClient.search).toHaveBeenCalledWith('test', 'doc');
    });

    it('should search with type filter', async () => {
      (mockClient.search as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await searchTools.yuque_search.handler(mockClient, { query: 'test', type: 'doc' } as never);
      expect(mockClient.search).toHaveBeenCalledWith('test', 'doc');
    });
  });
});

describe('tocTools', () => {
  describe('yuque_get_toc', () => {
    it('should get toc', async () => {
      (mockClient.getToc as ReturnType<typeof vi.fn>).mockResolvedValue([
        { title: 'Ch1', uuid: 'u1', url: '/ch1', prev_uuid: '', sibling_uuid: '', child_uuid: '', parent_uuid: '', doc_id: 1, level: 0, id: 1, open_window: 0, visible: 1 },
      ]);
      const result = await tocTools.yuque_get_toc.handler(mockClient, { repo_id: 1 } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty('title', 'Ch1');
    });
  });

  describe('yuque_update_toc', () => {
    it('should update toc', async () => {
      (mockClient.updateToc as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await tocTools.yuque_update_toc.handler(mockClient, { repo_id: 1, toc: 'new toc' } as never);
      expect(result.content[0].type).toBe('text');
    });
  });
});
