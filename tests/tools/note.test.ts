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
  describe('yuque_update_note', () => {
    it('should pass body directly to client.updateNote', async () => {
      const mockNote = {
        id: 1,
        slug: 'abc',
        content: { source: 'updated', html: '<p>updated</p>', abstract: 'updated' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
        status: 0,
      };
      (mockClient.updateNote as ReturnType<typeof vi.fn>).mockResolvedValue(mockNote);
      const result = await noteTools.yuque_update_note.handler(mockClient, {
        note_id: 1,
        body: 'Hello\n\nWorld',
      });
      expect(mockClient.updateNote).toHaveBeenCalledWith(1, { body: 'Hello\n\nWorld' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('id', 1);
    });

    it('should pass plain text body to client.updateNote', async () => {
      const mockNote = {
        id: 2,
        slug: 'xyz',
        content: { source: 'plain', html: '<p>plain</p>', abstract: 'plain' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
        status: 0,
      };
      (mockClient.updateNote as ReturnType<typeof vi.fn>).mockResolvedValue(mockNote);
      await noteTools.yuque_update_note.handler(mockClient, {
        note_id: 2,
        body: 'Just a single line',
      });
      expect(mockClient.updateNote).toHaveBeenCalledWith(2, { body: 'Just a single line' });
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
});
