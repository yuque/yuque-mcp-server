import { describe, it, expect } from 'vitest';
import {
  formatUser,
  formatRepo,
  formatDocSummary,
  formatDoc,
  formatSheet,
  formatToc,
} from '../../src/utils/format.js';
import type { YuqueUser, YuqueRepo, YuqueDoc, YuqueTocItem } from '../../src/services/types.js';

describe('format utilities', () => {
  describe('formatUser', () => {
    it('should format user data', () => {
      const user: YuqueUser = {
        id: 1,
        type: 'User',
        login: 'testuser',
        name: 'Test User',
        description: 'Test description',
        avatar_url: 'https://example.com/avatar.png',
        books_count: 5,
        public_books_count: 3,
        followers_count: 10,
        following_count: 8,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const result = formatUser(user);
      expect(result).toEqual({
        id: 1,
        login: 'testuser',
        name: 'Test User',
        description: 'Test description',
        avatar_url: 'https://example.com/avatar.png',
        books_count: 5,
        followers_count: 10,
      });
    });
  });

  describe('formatRepo', () => {
    it('should format repo data', () => {
      const repo: YuqueRepo = {
        id: 1,
        type: 'Book',
        slug: 'test-repo',
        name: 'Test Repo',
        namespace: 'user/test-repo',
        user_id: 1,
        description: 'Test description',
        creator_id: 1,
        public: 1,
        items_count: 5,
        likes_count: 10,
        watches_count: 3,
        content_updated_at: '2024-01-01',
        updated_at: '2024-01-02',
        created_at: '2024-01-01',
      };

      const result = formatRepo(repo);
      expect(result).toEqual({
        id: 1,
        slug: 'test-repo',
        name: 'Test Repo',
        namespace: 'user/test-repo',
        description: 'Test description',
        public: true,
        items_count: 5,
        updated_at: '2024-01-02',
      });
    });
  });

  describe('formatDocSummary', () => {
    it('should format doc summary without body', () => {
      const doc: YuqueDoc = {
        id: 1, slug: 'test-doc', title: 'Test Doc', book_id: 1, user_id: 1,
        format: 'markdown', body: 'Test content', body_draft: '',
        body_html: '<p>Test content</p>', body_lake: '', creator_id: 1,
        public: 1, status: 1, likes_count: 5, comments_count: 2,
        content_updated_at: '2024-01-01', deleted_at: null,
        created_at: '2024-01-01', updated_at: '2024-01-02',
        published_at: '2024-01-01', first_published_at: '2024-01-01',
        word_count: 100, cover: null, description: 'Test description',
      };

      const result = formatDocSummary(doc);
      expect(result).toEqual({
        id: 1, slug: 'test-doc', title: 'Test Doc', format: 'markdown',
        public: true, word_count: 100, updated_at: '2024-01-02',
      });
      expect(result).not.toHaveProperty('body');
    });
  });

  describe('formatDoc', () => {
    const doc: YuqueDoc = {
      id: 1, slug: 'test-doc', title: 'Test Doc', book_id: 1, user_id: 1,
      format: 'markdown', body: 'Test content', body_draft: '',
      body_html: '<p>Test content</p>', body_lake: '<!doctype lake>', creator_id: 1,
      public: 1, status: 1, likes_count: 5, comments_count: 2,
      content_updated_at: '2024-01-01', deleted_at: null,
      created_at: '2024-01-01', updated_at: '2024-01-02',
      published_at: '2024-01-01', first_published_at: '2024-01-01',
      word_count: 100, cover: null, description: 'Test description',
    };

    it('should format full doc with body', () => {
      const result = formatDoc(doc);
      expect(result).toHaveProperty('body', 'Test content');
      expect(result).toHaveProperty('body_html', '<p>Test content</p>');
      expect(result).toHaveProperty('description', 'Test description');
    });

    it('should not include body_lake by default', () => {
      const result = formatDoc(doc);
      expect(result).not.toHaveProperty('body_lake');
    });

    it('should include body_lake when includeLake is true', () => {
      const result = formatDoc(doc, { includeLake: true });
      expect(result).toHaveProperty('body_lake', '<!doctype lake>');
    });

    it('should expose body_sheet for sheet documents', () => {
      const sheetDoc: YuqueDoc = {
        ...doc,
        type: 'Sheet',
        format: 'lakesheet',
        body: '',
        body_sheet: '{"version":"1.0","data":[]}',
      };
      const result = formatDoc(sheetDoc);
      expect(result).toMatchObject({
        type: 'Sheet',
        format: 'lakesheet',
        body: '{"version":"1.0","data":[]}',
        body_sheet: '{"version":"1.0","data":[]}',
      });
    });

    it('should not include body_lake when includeLake is false', () => {
      const result = formatDoc(doc, { includeLake: false });
      expect(result).not.toHaveProperty('body_lake');
    });
  });

  describe('formatSheet', () => {
    const baseDoc: YuqueDoc = {
      id: 1, slug: 'test-sheet', title: 'Test Sheet', book_id: 1, user_id: 1,
      format: 'lakesheet', body: '', body_draft: '',
      body_html: '', body_lake: '', creator_id: 1,
      public: 1, status: 1, likes_count: 0, comments_count: 0,
      content_updated_at: '2024-01-01', deleted_at: null,
      created_at: '2024-01-01', updated_at: '2024-01-02',
      published_at: '2024-01-01', first_published_at: '2024-01-01',
      word_count: 0, cover: null, description: '',
    };

    it('should format single sheet', () => {
      const doc: YuqueDoc = {
        ...baseDoc,
        body_sheet: JSON.stringify({
          version: '1.0',
          data: [{ name: 'Sheet1', table: [['A', 'B'], ['1', '2'], ['3', '4']] }],
        }),
      };
      const result = formatSheet(doc);
      expect(result.success).toBe(true);
      expect(result.formatted).toContain('### Sheet1');
      expect(result.formatted).toContain('| A | B |');
      expect(result.formatted).toContain('| 1 | 2 |');
      expect(result.formatted).toContain('| 3 | 4 |');
    });

    it('should format multiple sheets preserving all tabs', () => {
      const doc: YuqueDoc = {
        ...baseDoc,
        body_sheet: JSON.stringify({
          version: '1.0',
          data: [
            { name: 'Sales', table: [['Month', 'Revenue'], ['Jan', '100'], ['Feb', '200']] },
            { name: 'Users', table: [['Name', 'Age'], ['Alice', '30'], ['Bob', '25']] },
            { name: 'Empty', table: [] },
          ],
        }),
      };
      const result = formatSheet(doc);
      expect(result.success).toBe(true);
      // First sheet
      expect(result.formatted).toContain('### Sales');
      expect(result.formatted).toContain('| Month | Revenue |');
      expect(result.formatted).toContain('| Jan | 100 |');
      // Second sheet — must not be dropped
      expect(result.formatted).toContain('### Users');
      expect(result.formatted).toContain('| Name | Age |');
      expect(result.formatted).toContain('| Alice | 30 |');
      expect(result.formatted).toContain('| Bob | 25 |');
      // Empty table is skipped
      expect(result.formatted).not.toContain('### Empty');
    });

    it('should fall back to raw data when data is empty', () => {
      const raw = JSON.stringify({ version: '1.0', data: [] });
      const doc: YuqueDoc = { ...baseDoc, body_sheet: raw };
      const result = formatSheet(doc);
      expect(result.success).toBe(false);
      expect(result.formatted).toBe(raw);
    });

    it('should fall back to raw data when parse fails', () => {
      const doc: YuqueDoc = { ...baseDoc, body_sheet: 'not-json' };
      const result = formatSheet(doc);
      expect(result.success).toBe(false);
      expect(result.formatted).toBe('not-json');
    });
  });

  describe('formatToc', () => {
    it('should format TOC items', () => {
      const items: YuqueTocItem[] = [
        { title: 'Chapter 1', uuid: 'uuid-1', url: '/doc1', prev_uuid: '', sibling_uuid: 'uuid-2', child_uuid: '', parent_uuid: '', doc_id: 1, level: 0, id: 1, open_window: 0, visible: 1 },
        { title: 'Chapter 2', uuid: 'uuid-2', url: '/doc2', prev_uuid: 'uuid-1', sibling_uuid: '', child_uuid: '', parent_uuid: '', doc_id: 2, level: 0, id: 2, open_window: 0, visible: 0 },
      ];

      const result = formatToc(items);
      expect(result).toEqual([
        { title: 'Chapter 1', uuid: 'uuid-1', doc_id: 1, level: 0, visible: true },
        { title: 'Chapter 2', uuid: 'uuid-2', doc_id: 2, level: 0, visible: false },
      ]);
    });
  });
});
