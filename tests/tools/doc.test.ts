import { describe, it, expect, vi, beforeEach } from 'vitest';
import { docTools } from '../../src/tools/doc.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  listDocs: vi.fn(),
  getDoc: vi.fn(),
  getYmdDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  updateYmdDoc: vi.fn(),
  updateToc: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

describe('docTools', () => {
  describe('yuque_list_docs', () => {
    it('should list docs for a repo', async () => {
      (mockClient.listDocs as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 1,
          slug: 'doc1',
          title: 'Doc 1',
          format: 'markdown',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
          word_count: 100,
        },
      ]);
      const result = await docTools.yuque_list_docs.handler(mockClient, { repo_id: 1 } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty('title', 'Doc 1');
      expect(mockClient.listDocs).toHaveBeenCalledWith(1, { offset: undefined, limit: undefined });
    });

    it('should accept namespace string', async () => {
      (mockClient.listDocs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await docTools.yuque_list_docs.handler(mockClient, { repo_id: 'user/repo' } as never);
      expect(mockClient.listDocs).toHaveBeenCalledWith('user/repo', {
        offset: undefined,
        limit: undefined,
      });
    });

    it('should pass pagination options through', async () => {
      (mockClient.listDocs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await docTools.yuque_list_docs.handler(mockClient, {
        repo_id: 1,
        offset: 100,
        limit: 50,
      } as never);
      expect(mockClient.listDocs).toHaveBeenCalledWith(1, { offset: 100, limit: 50 });
    });
  });

  describe('yuque_get_doc', () => {
    it('should read only through the YMD API by default with a numeric doc id', async () => {
      (mockClient.getYmdDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        doc_id: 1,
        title: 'Doc 1',
        url: '/user/repo/doc1',
        yfm: '# Hello from YMD',
        updated_at: '2024-01-03',
      });
      const result = await docTools.yuque_get_doc.handler(mockClient, {
        repo_id: 1,
        doc_id: 1,
        include_lake: false,
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('body', '# Hello from YMD');
      expect(parsed).toHaveProperty('format', 'markdown');
      expect(parsed).toHaveProperty('updated_at', '2024-01-03');
      expect(parsed).not.toHaveProperty('body_lake');
      expect(mockClient.getYmdDoc).toHaveBeenCalledWith(1);
      expect(mockClient.getDoc).not.toHaveBeenCalled();
    });

    it('should resolve a slug to a numeric id before the YMD read', async () => {
      (mockClient.getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 7,
        slug: 'doc-slug',
        title: 'Doc 7',
        body: '# Legacy body',
        format: 'markdown',
      });
      (mockClient.getYmdDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        doc_id: 7,
        title: 'Doc 7',
        url: '/user/repo/doc-slug',
        yfm: '# Hello from YMD',
        updated_at: '2024-01-03',
      });
      const result = await docTools.yuque_get_doc.handler(mockClient, {
        repo_id: 'user/repo',
        doc_id: 'doc-slug',
        include_lake: false,
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('body', '# Hello from YMD');
      expect(mockClient.getDoc).toHaveBeenCalledWith('user/repo', 'doc-slug');
      expect(mockClient.getYmdDoc).toHaveBeenCalledWith(7);
    });

    it('should use only the legacy API when include_lake is true', async () => {
      (mockClient.getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        slug: 'doc1',
        title: 'Doc 1',
        body: '# Hello',
        body_html: '<h1>Hello</h1>',
        body_lake: '<!doctype lake><p>Hello</p>',
        format: 'markdown',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        word_count: 100,
      });
      const result = await docTools.yuque_get_doc.handler(mockClient, {
        repo_id: 1,
        doc_id: 1,
        include_lake: true,
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('body', '# Hello');
      expect(parsed).toHaveProperty('body_lake', '<!doctype lake><p>Hello</p>');
      expect(mockClient.getYmdDoc).not.toHaveBeenCalled();
    });

    it('should use only the legacy API when read format is lake', async () => {
      (mockClient.getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        slug: 'doc1',
        title: 'Doc 1',
        body: '# Hello',
        body_html: '<h1>Hello</h1>',
        format: 'lake',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        word_count: 100,
      });

      const result = await docTools.yuque_get_doc.handler(mockClient, {
        repo_id: 1,
        doc_id: 1,
        format: 'lake',
        include_lake: false,
      } as never);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('body', '# Hello');
      expect(parsed).toHaveProperty('format', 'lake');
      expect(mockClient.getYmdDoc).not.toHaveBeenCalled();
    });
  });

  describe('yuque_create_doc', () => {
    it('should create doc with title and body', async () => {
      (mockClient.createDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2,
        slug: 'new-doc',
        title: 'New Doc',
        body: 'Content',
        format: 'markdown',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        word_count: 1,
      });
      const result = await docTools.yuque_create_doc.handler(mockClient, {
        repo_id: 1,
        title: 'New Doc',
        body: 'Content',
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('title', 'New Doc');
      expect(mockClient.createDoc).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: 'New Doc', body: 'Content' })
      );
    });

    it('should auto-append created doc to TOC', async () => {
      (mockClient.createDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2,
        slug: 'new-doc',
        title: 'New Doc',
        body: 'Content',
        format: 'markdown',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        word_count: 1,
      });
      (mockClient.updateToc as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await docTools.yuque_create_doc.handler(mockClient, {
        repo_id: 1,
        title: 'New Doc',
        body: 'Content',
      } as never);
      expect(mockClient.updateToc).toHaveBeenCalledWith(1, expect.stringContaining('"appendNode"'));
      expect(result.content).toHaveLength(1); // no warning
    });

    it('should return warning when TOC append fails', async () => {
      (mockClient.createDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 3,
        slug: 'doc3',
        title: 'Doc 3',
        body: '',
        format: 'markdown',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        word_count: 0,
      });
      (mockClient.updateToc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('TOC error'));
      const result = await docTools.yuque_create_doc.handler(mockClient, {
        repo_id: 1,
        title: 'Doc 3',
      } as never);
      expect(result.content).toHaveLength(2); // doc + warning
      expect(result.content[1].text).toContain('failed to auto-append to TOC');
    });
  });

  describe('yuque_update_doc', () => {
    it('should update doc metadata without YMD body update', async () => {
      (mockClient.updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        slug: 'doc1',
        title: 'Updated',
        body: 'New content',
        format: 'markdown',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        word_count: 2,
      });
      const result = await docTools.yuque_update_doc.handler(mockClient, {
        repo_id: 1,
        doc_id: 1,
        title: 'Updated',
      } as never);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('title', 'Updated');
      expect(mockClient.updateDoc).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ title: 'Updated' })
      );
      expect(mockClient.updateYmdDoc).not.toHaveBeenCalled();
    });

    it.each([undefined, 'markdown'] as const)(
      'should update a markdown body only through the YMD API when format is %s',
      async (format) => {
        (mockClient.updateYmdDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
          doc_id: 1,
          title: 'Doc 1',
          url: '/user/repo/doc1',
          updated_at: '2024-01-03',
        });

        const result = await docTools.yuque_update_doc.handler(mockClient, {
          repo_id: 1,
          doc_id: 1,
          body: '# Updated YMD',
          format,
        } as never);

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed).toMatchObject({
          id: 1,
          title: 'Doc 1',
          url: '/user/repo/doc1',
          updated_at: '2024-01-03',
        });
        expect(mockClient.updateYmdDoc).toHaveBeenCalledWith(1, '# Updated YMD');
        expect(mockClient.getDoc).not.toHaveBeenCalled();
        expect(mockClient.getYmdDoc).not.toHaveBeenCalled();
        expect(mockClient.updateDoc).not.toHaveBeenCalled();
      }
    );

    it('should resolve a slug to a numeric id before the YMD write', async () => {
      (mockClient.getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 7,
        slug: 'doc-slug',
        title: 'Doc 7',
        format: 'markdown',
      });
      (mockClient.updateYmdDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        doc_id: 7,
        title: 'Doc 7',
        url: '/user/repo/doc-slug',
        updated_at: '2024-01-03',
      });

      await docTools.yuque_update_doc.handler(mockClient, {
        repo_id: 'user/repo',
        doc_id: 'doc-slug',
        body: '# Updated YMD',
      } as never);

      expect(mockClient.getDoc).toHaveBeenCalledWith('user/repo', 'doc-slug');
      expect(mockClient.updateYmdDoc).toHaveBeenCalledWith(7, '# Updated YMD');
      expect(mockClient.updateDoc).not.toHaveBeenCalled();
    });

    it('should reject mixed metadata + markdown body updates', async () => {
      await expect(
        docTools.yuque_update_doc.handler(mockClient, {
          repo_id: 1,
          doc_id: 1,
          title: 'Updated',
          body: '# Updated YMD',
        } as never)
      ).rejects.toThrow('cannot change title/slug/public in the same call');

      expect(mockClient.updateDoc).not.toHaveBeenCalled();
      expect(mockClient.updateYmdDoc).not.toHaveBeenCalled();
    });

    it('should use legacy doc update when body format is lake', async () => {
      (mockClient.updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        slug: 'doc1',
        title: 'Updated',
        body: '<!doctype lake><p>Updated</p>',
        format: 'lake',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        word_count: 2,
      });

      const result = await docTools.yuque_update_doc.handler(mockClient, {
        repo_id: 1,
        doc_id: 1,
        body: '<!doctype lake><p>Updated</p>',
        format: 'lake',
      } as never);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('format', 'lake');
      expect(mockClient.updateDoc).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          body: '<!doctype lake><p>Updated</p>',
          format: 'lake',
        })
      );
      expect(mockClient.updateYmdDoc).not.toHaveBeenCalled();
      expect(mockClient.getYmdDoc).not.toHaveBeenCalled();
    });
  });
});
