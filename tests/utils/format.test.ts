import { describe, it, expect } from 'vitest';
import {
  formatUser,
  formatRepo,
  formatDocSummary,
  formatDoc,
  formatSheet,
  formatDocVersion,
  formatDocVersionDetail,
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
        id: 1,
        slug: 'test-doc',
        title: 'Test Doc',
        book_id: 1,
        user_id: 1,
        format: 'markdown',
        body: 'Test content',
        body_draft: '',
        body_html: '<p>Test content</p>',
        body_lake: '',
        creator_id: 1,
        public: 1,
        status: 1,
        likes_count: 5,
        comments_count: 2,
        content_updated_at: '2024-01-01',
        deleted_at: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        published_at: '2024-01-01',
        first_published_at: '2024-01-01',
        word_count: 100,
        cover: null,
        description: 'Test description',
      };

      const result = formatDocSummary(doc);
      expect(result).toEqual({
        id: 1,
        slug: 'test-doc',
        title: 'Test Doc',
        format: 'markdown',
        public: true,
        word_count: 100,
        updated_at: '2024-01-02',
      });
      expect(result).not.toHaveProperty('body');
    });
  });

  describe('formatDoc', () => {
    const doc: YuqueDoc = {
      id: 1,
      slug: 'test-doc',
      title: 'Test Doc',
      book_id: 1,
      user_id: 1,
      format: 'markdown',
      body: 'Test content',
      body_draft: '',
      body_html: '<p>Test content</p>',
      body_lake: '<!doctype lake>',
      creator_id: 1,
      public: 1,
      status: 1,
      likes_count: 5,
      comments_count: 2,
      content_updated_at: '2024-01-01',
      deleted_at: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      published_at: '2024-01-01',
      first_published_at: '2024-01-01',
      word_count: 100,
      cover: null,
      description: 'Test description',
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

    it('should not include body_lake when includeLake is false', () => {
      const result = formatDoc(doc, { includeLake: false });
      expect(result).not.toHaveProperty('body_lake');
    });

    it('should expose the doc type in the summary only when the API returns it', () => {
      expect(formatDocSummary(doc)).not.toHaveProperty('type');
      expect(formatDocSummary({ ...doc, type: 'Sheet' })).toHaveProperty('type', 'Sheet');
    });

    it('should render sheet documents as a Markdown table', () => {
      const result = formatDoc({
        ...doc,
        type: 'Sheet',
        format: 'lakesheet',
        body: '',
        body_sheet: JSON.stringify({
          version: '1.0',
          data: [
            {
              name: 'Sheet1',
              table: [
                ['参数名', '类型'],
                ['name', 'string'],
              ],
            },
          ],
        }),
      });

      expect(result.body).toContain('### Sheet1');
      expect(result.body).toContain('| 参数名 | 类型 |');
      expect(result.body).toContain('| name | string |');
      expect(result).toHaveProperty('format_note', 'Sheet formatted as a Markdown table');
    });

    it('should fall back to raw sheet data when formatting fails', () => {
      const raw = 'not-json';
      const result = formatDoc({ ...doc, type: 'Sheet', format: 'lakesheet', body_sheet: raw });

      expect(result.body).toBe(raw);
      expect(result).toHaveProperty('body_sheet', raw);
      expect(result).toHaveProperty(
        'format_note',
        'Raw sheet data (Markdown table formatting failed)'
      );
    });

    it('should expose body_table for 数据表 documents without dropping body', () => {
      const bodyTable = JSON.stringify({
        totalCount: 1,
        pageSize: 100,
        page: 1,
        records: [{ values: [{ value: '写文档' }, { value: '进行中' }] }],
      });
      const result = formatDoc({
        ...doc,
        type: 'Table',
        format: 'laketable',
        body_table: bodyTable,
      });

      expect(result).toHaveProperty('body', 'Test content');
      expect(result).toHaveProperty('body_table', bodyTable);
    });

    it('should not include body_table for ordinary documents', () => {
      expect(formatDoc(doc)).not.toHaveProperty('body_table');
    });
  });

  describe('formatSheet', () => {
    const sheetDoc: YuqueDoc = {
      id: 1,
      slug: 'test-sheet',
      title: 'Test Sheet',
      book_id: 1,
      user_id: 1,
      type: 'Sheet',
      format: 'lakesheet',
      body: '',
      body_draft: '',
      body_html: '',
      body_lake: '',
      creator_id: 1,
      public: 1,
      status: 1,
      likes_count: 0,
      comments_count: 0,
      content_updated_at: '2024-01-01',
      deleted_at: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      published_at: '2024-01-01',
      first_published_at: '2024-01-01',
      word_count: 0,
      cover: null,
      description: '',
    };

    function sheetWith(data: unknown[]): YuqueDoc {
      return { ...sheetDoc, body_sheet: JSON.stringify({ version: '1.0', data }) };
    }

    it('should render one table per tab and keep every tab', () => {
      const doc = sheetWith([
        {
          name: '销量',
          table: [
            ['月份', '收入'],
            ['一月', '100'],
            ['二月', '200'],
          ],
        },
        {
          name: '用户',
          table: [
            ['姓名', '年龄'],
            ['小明', '30'],
          ],
        },
        { name: '空表', table: [] },
      ]);

      const result = formatSheet(doc);

      expect(result.success).toBe(true);
      expect(result.formatted).toContain('### 销量');
      expect(result.formatted).toContain('| 月份 | 收入 |');
      expect(result.formatted).toContain('| 二月 | 200 |');
      expect(result.formatted).toContain('### 用户');
      expect(result.formatted).toContain('| 小明 | 30 |');
      expect(result.formatted).not.toContain('### 空表');
    });

    it('should use the first non-blank row as the header', () => {
      const doc = sheetWith([
        { name: 'Sheet1', table: [[], ['', ''], ['参数名', '类型'], ['name', 'string']] },
      ]);

      const result = formatSheet(doc);

      expect(result.success).toBe(true);
      expect(result.formatted).toContain('| 参数名 | 类型 |');
      expect(result.formatted).toContain('| --- | --- |');
      expect(result.formatted).not.toContain('| --- | --- |\n| 参数名');
    });

    it('should pad short rows and keep wide rows so no cell is lost', () => {
      const doc = sheetWith([
        {
          name: 'Sheet1',
          table: [
            ['参数名', '类型', '必填'],
            ['name', 'string'],
            ['flag', 'boolean', '0', '备注'],
          ],
        },
      ]);

      const result = formatSheet(doc);
      const lines = result.formatted.split('\n');

      // Header is padded to the widest row (4 columns).
      expect(lines[2]).toBe('| 参数名 | 类型 | 必填 |  |');
      // Short row keeps its column alignment.
      expect(lines[4]).toBe('| name | string |  |  |');
      // Wide row is fully preserved.
      expect(lines[5]).toBe('| flag | boolean | 0 | 备注 |');
    });

    it('should deduplicate identical tab names', () => {
      const doc = sheetWith([
        { table: [['A'], ['1']] },
        { name: 'Sheet1', table: [['C'], ['3']] },
        { table: [['E'], ['5']] },
      ]);

      const result = formatSheet(doc);

      expect(result.formatted).toContain('### Sheet1\n');
      expect(result.formatted).toContain('### Sheet1 (2)');
      expect(result.formatted).toContain('### Sheet1 (3)');
    });

    it('should escape cells that would break the table', () => {
      const doc = sheetWith([
        {
          name: 'Sheet1',
          table: [
            ['a', 'b'],
            ['x|y', '第一行\n第二行'],
          ],
        },
      ]);

      const result = formatSheet(doc);

      expect(result.formatted).toContain('| x\\|y | 第一行 第二行 |');
    });

    it('should fall back to raw data when there is nothing to render', () => {
      const raw = JSON.stringify({ version: '1.0', data: [] });
      const result = formatSheet({ ...sheetDoc, body_sheet: raw });

      expect(result.success).toBe(false);
      expect(result.formatted).toBe(raw);
    });

    it('should fall back to raw data when the payload is not JSON', () => {
      const result = formatSheet({ ...sheetDoc, body_sheet: 'not-json' });

      expect(result.success).toBe(false);
      expect(result.formatted).toBe('not-json');
    });
  });

  describe('formatDocVersion', () => {
    const version = {
      id: 11,
      doc_id: 2,
      slug: 'doc',
      title: 'Doc',
      user_id: 1,
      created_at: '2024-03-01T00:00:00.000Z',
      updated_at: '2024-03-02T00:00:00.000Z',
    };

    it('should format a version without body', () => {
      const result = formatDocVersion(version);

      expect(result).toEqual({
        id: 11,
        doc_id: 2,
        title: 'Doc',
        slug: 'doc',
        created_at: '2024-03-01T00:00:00.000Z',
      });
      expect(result).not.toHaveProperty('body');
    });

    it('should include a trimmed user when the API returns one', () => {
      const result = formatDocVersion({
        ...version,
        user: {
          id: 1,
          type: 'User',
          login: 'alice',
          name: 'Alice',
          description: 'desc',
          avatar_url: '',
          books_count: 0,
          public_books_count: 0,
          followers_count: 0,
          following_count: 0,
          created_at: '',
          updated_at: '',
        },
      });

      expect(result).toHaveProperty('user', { id: 1, login: 'alice', name: 'Alice' });
    });

    it('should prefer body_md and keep the diff', () => {
      const detail = formatDocVersionDetail({
        ...version,
        format: 'markdown',
        body: '# Raw',
        body_html: '<h1>Raw</h1>',
        body_md: '# Markdown',
        body_asl: '<!doctype lake><p>Raw</p>',
        diff: '+# Markdown',
      });

      expect(detail).toMatchObject({ format: 'markdown', body: '# Markdown', diff: '+# Markdown' });
    });

    it('should fall back to the raw body when body_md is empty', () => {
      const detail = formatDocVersionDetail({
        ...version,
        format: 'lake',
        body: '<!doctype lake><p>Raw</p>',
        body_html: '',
        body_md: '',
        body_asl: '',
        diff: '',
      });

      expect(detail).toHaveProperty('body', '<!doctype lake><p>Raw</p>');
    });
  });

  describe('formatToc', () => {
    it('should format TOC items', () => {
      const items: YuqueTocItem[] = [
        {
          title: 'Chapter 1',
          uuid: 'uuid-1',
          url: '/doc1',
          prev_uuid: '',
          sibling_uuid: 'uuid-2',
          child_uuid: '',
          parent_uuid: '',
          doc_id: 1,
          level: 0,
          id: 1,
          open_window: 0,
          visible: 1,
        },
        {
          title: 'Chapter 2',
          uuid: 'uuid-2',
          url: '/doc2',
          prev_uuid: 'uuid-1',
          sibling_uuid: '',
          child_uuid: '',
          parent_uuid: '',
          doc_id: 2,
          level: 0,
          id: 2,
          open_window: 0,
          visible: 0,
        },
      ];

      const result = formatToc(items);
      expect(result).toEqual([
        { title: 'Chapter 1', uuid: 'uuid-1', doc_id: 1, level: 0, visible: true },
        { title: 'Chapter 2', uuid: 'uuid-2', doc_id: 2, level: 0, visible: false },
      ]);
    });
  });
});
