import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resourceTools } from '../../src/tools/resource.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  getResource: vi.fn(),
  createResource: vi.fn(),
  updateResource: vi.fn(),
} as unknown as YuqueClient;

const mockBoardResult = {
  doc_id: 1,
  title: 'Doc 1',
  url: '/user/repo/doc1',
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

beforeEach(() => vi.clearAllMocks());

describe('resourceTools', () => {
  describe('yuque_get_resource', () => {
    it('should get board resource detail', async () => {
      (mockClient.getResource as ReturnType<typeof vi.fn>).mockResolvedValue(mockBoardResult);

      const result = await resourceTools.yuque_get_resource.handler(mockClient, {
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
      } as never);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.board.page_ref.src).toBe('board://board-1');
      expect(mockClient.getResource).toHaveBeenCalledWith({
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
      });
    });

    it('should reject when doc_id and url are both provided', () => {
      const result = resourceTools.yuque_get_resource.inputSchema.safeParse({
        resource_type: 'board',
        doc_id: 1,
        url: 'https://www.yuque.com/user/repo/doc',
        resource_id: 'board-1',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.some((issue) => issue.message.includes('doc_id or url'))).toBe(
        true
      );
    });

    it('should reject board locator resource_id', () => {
      const result = resourceTools.yuque_get_resource.inputSchema.safeParse({
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board://board-1',
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.some((issue) => issue.message.includes('raw board resource id'))
      ).toBe(true);
    });
  });

  describe('yuque_create_resource', () => {
    it('should create a board resource', async () => {
      (mockClient.createResource as ReturnType<typeof vi.fn>).mockResolvedValue(mockBoardResult);

      const result = await resourceTools.yuque_create_resource.handler(mockClient, {
        resource_type: 'board',
        doc_id: 1,
        type: 'mindmap',
        dsl: '- root',
        insert_after_lake_id: 'lake-1',
      } as never);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.board.resource.kind).toBe('mindmap');
      expect(mockClient.createResource).toHaveBeenCalledWith({
        resource_type: 'board',
        doc_id: 1,
        type: 'mindmap',
        dsl: '- root',
        insert_after_lake_id: 'lake-1',
      });
    });

    it('should reject when doc_id and url are missing', () => {
      const result = resourceTools.yuque_create_resource.inputSchema.safeParse({
        resource_type: 'board',
        type: 'mindmap',
        dsl: '- root',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.some((issue) => issue.message.includes('doc_id or url'))).toBe(
        true
      );
    });
  });

  describe('yuque_update_resource', () => {
    it('should update a board resource with text DSL', async () => {
      (mockClient.updateResource as ReturnType<typeof vi.fn>).mockResolvedValue(mockBoardResult);

      const result = await resourceTools.yuque_update_resource.handler(mockClient, {
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
        text: '- next',
      } as never);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.board.resource.id).toBe('board-1');
      expect(mockClient.updateResource).toHaveBeenCalledWith({
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
        text: '- next',
      });
    });

    it('should update a board resource with JSON DSL', async () => {
      const nextDsl = {
        value: {
          diagramData: {
            body: [],
          },
        },
        format: 'json',
        language: 'json',
      };
      (mockClient.updateResource as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockBoardResult,
        board: {
          ...mockBoardResult.board,
          dsl: nextDsl,
        },
      });

      const result = await resourceTools.yuque_update_resource.handler(mockClient, {
        resource_type: 'board',
        url: 'https://www.yuque.com/user/repo/doc',
        resource_id: 'board-1',
        dsl: nextDsl,
      } as never);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.board.dsl.format).toBe('json');
      expect(mockClient.updateResource).toHaveBeenCalledWith({
        resource_type: 'board',
        url: 'https://www.yuque.com/user/repo/doc',
        resource_id: 'board-1',
        dsl: nextDsl,
      });
    });

    it('should reject update with both text and dsl', () => {
      const result = resourceTools.yuque_update_resource.inputSchema.safeParse({
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
        text: '- root',
        dsl: { format: 'json', language: 'json', value: {} },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.some((issue) => issue.message.includes('text or dsl'))).toBe(
        true
      );
    });

    it('should reject update without text or dsl', () => {
      const result = resourceTools.yuque_update_resource.inputSchema.safeParse({
        resource_type: 'board',
        doc_id: 1,
        resource_id: 'board-1',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.some((issue) => issue.message.includes('text or dsl'))).toBe(
        true
      );
    });
  });
});
