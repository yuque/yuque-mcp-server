import { describe, it, expect, vi, beforeEach } from 'vitest';
import { noteTools } from '../../src/tools/note.js';
import type { YuqueClient } from '../../src/services/yuque-client.js';

const mockClient = {
  listNotes: vi.fn(),
  getNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
} as unknown as YuqueClient;

beforeEach(() => vi.clearAllMocks());

describe('noteTools', () => {
  describe('yuque_list_notes', () => {
    it('should list pinned and regular notes with summaries', async () => {
      (mockClient.listNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
        has_more: true,
        pin_notes: [
          {
            id: 1,
            slug: 'pinned',
            content: { abstract: '<p>Pinned <strong>note</strong></p>' },
            word_count: 3,
            tags: ['pin'],
            created_at: '2024-01-01',
            updated_at: '2024-01-02',
            pinned_at: '2024-01-03',
            status: 0,
          },
        ],
        notes: [
          {
            id: 2,
            slug: 'regular',
            content: { abstract: 'Regular note' },
            word_count: 2,
            tags: [],
            created_at: '2024-01-04',
            updated_at: '2024-01-05',
            pinned_at: null,
            status: 0,
          },
        ],
      });

      const result = await noteTools.yuque_list_notes.handler(mockClient, {
        status: 0,
        page: 2,
        limit: 10,
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toMatchObject({
        total: 2,
        pinned: 1,
        has_more: true,
      });
      expect(parsed.notes[0]).toMatchObject({
        id: 1,
        slug: 'pinned',
        content_preview: 'Pinned note',
        is_pinned: true,
      });
      expect(parsed.notes[1]).toMatchObject({
        id: 2,
        slug: 'regular',
        is_pinned: false,
      });
      expect(mockClient.listNotes).toHaveBeenCalledWith(0, 2, 10);
    });
  });

  describe('yuque_get_note', () => {
    it('should return full note content', async () => {
      (mockClient.getNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 3,
        slug: 'full-note',
        content: {
          source: 'Plain text',
          abstract: 'Fallback abstract',
          html: '<p>Plain text</p>',
        },
        word_count: 2,
        tags: ['daily'],
        created_at: '2024-02-01',
        updated_at: '2024-02-02',
        published_at: '2024-02-03',
        pinned_at: '2024-02-04',
        likes_count: 4,
        comments_count: 5,
        status: 0,
      });

      const result = await noteTools.yuque_get_note.handler(mockClient, { note_id: 3 });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toMatchObject({
        id: 3,
        slug: 'full-note',
        content: {
          text: 'Plain text',
          html: '<p>Plain text</p>',
        },
        is_pinned: true,
        likes_count: 4,
        comments_count: 5,
      });
      expect(mockClient.getNote).toHaveBeenCalledWith(3);
    });
  });

  describe('yuque_create_note', () => {
    it('should return id, slug, and note_url in the response', async () => {
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 123,
        slug: 'abc456',
        note_url: 'https://www.yuque.com/notes/abc456',
      });
      const result = await noteTools.yuque_create_note.handler(mockClient, { body: 'Hello world' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('success', true);
      expect(parsed).toHaveProperty('id', 123);
      expect(parsed).toHaveProperty('slug', 'abc456');
      expect(parsed).toHaveProperty('note_url', 'https://www.yuque.com/notes/abc456');
      expect(parsed).toHaveProperty('message', 'Note created successfully');
    });

    it('should pass body argument to client.createNote', async () => {
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        slug: 'x',
        note_url: 'https://www.yuque.com/notes/x',
      });
      await noteTools.yuque_create_note.handler(mockClient, { body: 'Test content' });
      expect(mockClient.createNote).toHaveBeenCalledWith({ body: 'Test content' });
    });
  });

  describe('yuque_update_note', () => {
    it('should render markdown instead of escaping it', async () => {
      (mockClient.updateNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        slug: 'updated',
        content: { source: '# 标题', html: '<h1>标题</h1>' },
        word_count: 2,
        tags: [],
        created_at: '2024-03-01',
        updated_at: '2024-03-02',
        published_at: null,
        pinned_at: null,
        likes_count: 0,
        comments_count: 0,
        status: 0,
      });

      await noteTools.yuque_update_note.handler(mockClient, {
        note_id: 4,
        body: '# 标题\n\n- 一\n- 二',
      } as never);

      const payload = (mockClient.updateNote as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
        source: string;
        html: string;
        abstract: string;
      };
      expect(payload.source).toBe('# 标题\n\n- 一\n- 二');
      expect(payload.html).toContain('<h1>标题</h1>');
      expect(payload.html).toContain('<li>一</li>');
      expect(payload.html).not.toContain('&lt;h1&gt;');
      expect(payload.abstract).toBe('标题 一 二');
    });

    it('should archive a note without resending its body', async () => {
      (mockClient.getNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        slug: 'note',
        content: { source: '# 旧内容', html: '<h1>旧内容</h1>', abstract: '旧内容' },
        word_count: 4,
        tags: [],
        created_at: '2024-03-01',
        updated_at: '2024-03-02',
        published_at: null,
        pinned_at: null,
        likes_count: 0,
        comments_count: 0,
        status: 0,
      });
      (mockClient.updateNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        slug: 'note',
        content: { source: '# 旧内容', html: '<h1>旧内容</h1>', abstract: '旧内容' },
        word_count: 4,
        tags: [],
        created_at: '2024-03-01',
        updated_at: '2024-03-03',
        published_at: null,
        pinned_at: null,
        likes_count: 0,
        comments_count: 0,
        status: 9,
      });

      await noteTools.yuque_update_note.handler(mockClient, {
        note_id: 4,
        status: 'archived',
      } as never);

      expect(mockClient.getNote).toHaveBeenCalledWith(4);
      expect(mockClient.updateNote).toHaveBeenCalledWith(4, {
        source: '# 旧内容',
        html: '<h1>旧内容</h1>',
        abstract: '旧内容',
        status: 'archived',
      });
    });

    it('should overwrite the body and archive in one call', async () => {
      (mockClient.updateNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        slug: 'note',
        content: { source: '# 新内容', html: '<h1>新内容</h1>', abstract: '新内容' },
        word_count: 4,
        tags: [],
        created_at: '2024-03-01',
        updated_at: '2024-03-03',
        published_at: null,
        pinned_at: null,
        likes_count: 0,
        comments_count: 0,
        status: 9,
      });

      await noteTools.yuque_update_note.handler(mockClient, {
        note_id: 4,
        body: '# 新内容',
        status: 'archived',
      } as never);

      const payload = (mockClient.updateNote as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
        html: string;
        status: string;
      };
      expect(payload.html).toContain('<h1>新内容</h1>');
      expect(payload.status).toBe('archived');
      expect(mockClient.getNote).not.toHaveBeenCalled();
    });

    it('should reject an update with neither body nor status', async () => {
      await expect(
        noteTools.yuque_update_note.handler(mockClient, { note_id: 4 } as never)
      ).rejects.toThrow('requires body, status, or both');

      expect(mockClient.updateNote).not.toHaveBeenCalled();
    });

    it('should update source, html, and abstract from body', async () => {
      (mockClient.updateNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        slug: 'updated',
        content: {
          source: 'Updated note',
          html: '<p>Updated note</p>',
        },
        word_count: 2,
        tags: [],
        created_at: '2024-03-01',
        updated_at: '2024-03-02',
        published_at: null,
        pinned_at: null,
        likes_count: 0,
        comments_count: 0,
        status: 0,
      });

      const result = await noteTools.yuque_update_note.handler(mockClient, {
        note_id: 4,
        body: 'Updated note',
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.content).toEqual({
        text: 'Updated note',
        html: '<p>Updated note</p>',
      });
      expect(parsed.is_pinned).toBe(false);
      expect(mockClient.updateNote).toHaveBeenCalledWith(4, {
        source: 'Updated note',
        html: '<p>Updated note</p>',
        abstract: 'Updated note',
      });
    });
  });
});
