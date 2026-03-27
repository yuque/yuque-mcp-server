import { describe, it, expect, vi, beforeEach } from 'vitest';
import { docTools } from '../../src/tools/doc.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  listDocs: vi.fn(),
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateToc: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

describe('docTools', () => {
  describe('yuque_list_docs', () => {
    it('should list docs for a repo', async () => {
      (mockClient.listDocs as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, slug: 'doc1', title: 'Doc 1', format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-02', word_count: 100 },
      ]);
      const result = await docTools.yuque_list_docs.handler(mockClient, { repo_id: 1 } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty('title', 'Doc 1');
      expect(mockClient.listDocs).toHaveBeenCalledWith(1);
    });

    it('should accept namespace string', async () => {
      (mockClient.listDocs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await docTools.yuque_list_docs.handler(mockClient, { repo_id: 'user/repo' } as never);
      expect(mockClient.listDocs).toHaveBeenCalledWith('user/repo');
    });
  });

  describe('yuque_get_doc', () => {
    it('should get doc with content', async () => {
      (mockClient.getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1, slug: 'doc1', title: 'Doc 1', body: '# Hello', body_html: '<h1>Hello</h1>',
        format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-02', word_count: 100,
      });
      const result = await docTools.yuque_get_doc.handler(mockClient, { repo_id: 1, doc_id: 1, include_lake: false } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('body', '# Hello');
      expect(parsed).not.toHaveProperty('body_lake');
      expect(mockClient.getDoc).toHaveBeenCalledWith(1, 1);
    });

    it('should include body_lake when include_lake is true', async () => {
      (mockClient.getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1, slug: 'doc1', title: 'Doc 1', body: '# Hello', body_html: '<h1>Hello</h1>',
        body_lake: '<!doctype lake><p>Hello</p>',
        format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-02', word_count: 100,
      });
      const result = await docTools.yuque_get_doc.handler(mockClient, { repo_id: 1, doc_id: 1, include_lake: true } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('body_lake', '<!doctype lake><p>Hello</p>');
    });
  });

  describe('yuque_create_doc', () => {
    it('should create doc with title and body', async () => {
      (mockClient.createDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2, slug: 'new-doc', title: 'New Doc', body: 'Content',
        format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-01', word_count: 1,
      });
      const result = await docTools.yuque_create_doc.handler(mockClient, {
        repo_id: 1, title: 'New Doc', body: 'Content',
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('title', 'New Doc');
      expect(mockClient.createDoc).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'New Doc', body: 'Content' }));
    });

    it('should auto-append created doc to TOC', async () => {
      (mockClient.createDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2, slug: 'new-doc', title: 'New Doc', body: 'Content',
        format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-01', word_count: 1,
      });
      (mockClient.updateToc as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await docTools.yuque_create_doc.handler(mockClient, {
        repo_id: 1, title: 'New Doc', body: 'Content',
      } as never);
      expect(mockClient.updateToc).toHaveBeenCalledWith(1, expect.stringContaining('"appendNode"'));
      expect(result.content).toHaveLength(1); // no warning
    });

    it('should return warning when TOC append fails', async () => {
      (mockClient.createDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 3, slug: 'doc3', title: 'Doc 3', body: '',
        format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-01', word_count: 0,
      });
      (mockClient.updateToc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('TOC error'));
      const result = await docTools.yuque_create_doc.handler(mockClient, {
        repo_id: 1, title: 'Doc 3',
      } as never);
      expect(result.content).toHaveLength(2); // doc + warning
      expect(result.content[1].text).toContain('failed to auto-append to TOC');
    });
  });

  describe('yuque_update_doc', () => {
    it('should update doc', async () => {
      (mockClient.updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1, slug: 'doc1', title: 'Updated', body: 'New content',
        format: 'markdown', created_at: '2024-01-01', updated_at: '2024-01-02', word_count: 2,
      });
      const result = await docTools.yuque_update_doc.handler(mockClient, {
        repo_id: 1, doc_id: 1, title: 'Updated',
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('title', 'Updated');
    });
  });
});
