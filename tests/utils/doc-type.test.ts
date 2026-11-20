import { describe, it, expect } from 'vitest';
import {
  isNonMarkdownDoc,
  isSheetDoc,
  isTableDoc,
  sheetSource,
  assertBodyWritable,
  assertCreateFormatSupported,
} from '../../src/utils/doc-type.js';
import { YuqueError } from '../../src/utils/error.js';
import type { YuqueDoc } from '../../src/services/types.js';

const baseDoc: YuqueDoc = {
  id: 1,
  slug: 'doc1',
  title: 'Doc',
  book_id: 1,
  user_id: 1,
  format: 'markdown',
  body: 'body',
  body_draft: '',
  body_html: '',
  body_lake: '',
  creator_id: 1,
  public: 1,
  status: 1,
  likes_count: 0,
  comments_count: 0,
  content_updated_at: '',
  deleted_at: null,
  created_at: '',
  updated_at: '',
  published_at: '',
  first_published_at: '',
  word_count: 0,
  cover: null,
  description: '',
};

describe('doc-type utilities', () => {
  it('detects non-markdown docs by type or legacy format', () => {
    expect(isNonMarkdownDoc({ type: 'Sheet', format: 'lakesheet' })).toBe(true);
    expect(isNonMarkdownDoc({ type: 'Table', format: 'laketable' })).toBe(true);
    expect(isNonMarkdownDoc({ format: 'lakeboard' })).toBe(false);
    expect(isNonMarkdownDoc({ type: 'Board', format: 'lakeboard' })).toBe(true);
    expect(isNonMarkdownDoc({ type: 'Thread', format: 'markdown' })).toBe(true);
    expect(isNonMarkdownDoc({ type: 'Doc', format: 'markdown' })).toBe(false);
    expect(isNonMarkdownDoc({ format: 'markdown' })).toBe(false);
  });

  it('distinguishes sheet and table documents', () => {
    expect(isSheetDoc({ type: 'Sheet', format: 'lakesheet' })).toBe(true);
    expect(isSheetDoc({ format: 'lakesheet' })).toBe(true);
    expect(isSheetDoc({ type: 'Table', format: 'laketable' })).toBe(false);
    expect(isTableDoc({ type: 'Table', format: 'laketable' })).toBe(true);
    expect(isTableDoc({ type: 'Sheet', format: 'lakesheet' })).toBe(false);
  });

  it('falls back to body when body_sheet is missing', () => {
    expect(sheetSource({ ...baseDoc, body_sheet: '{"data":[]}' })).toBe('{"data":[]}');
    expect(sheetSource({ ...baseDoc, body: 'raw' })).toBe('raw');
  });

  it('rejects body writes on sheet, table, board and thread documents', () => {
    for (const type of ['Sheet', 'Table', 'Board', 'Thread']) {
      expect(() => assertBodyWritable({ ...baseDoc, type })).toThrow(YuqueError);
      expect(() => assertBodyWritable({ ...baseDoc, type })).toThrow(new RegExp(type));
    }
    expect(() => assertBodyWritable({ ...baseDoc, format: 'lakesheet' })).toThrow(YuqueError);
    expect(() => assertBodyWritable({ ...baseDoc, type: 'Doc' })).not.toThrow();
  });

  it('rejects sheet and table create formats only', () => {
    expect(() => assertCreateFormatSupported('lakesheet')).toThrow(YuqueError);
    expect(() => assertCreateFormatSupported('laketable')).toThrow(YuqueError);
    for (const format of [undefined, 'markdown', 'lake', 'html']) {
      expect(() => assertCreateFormatSupported(format)).not.toThrow();
    }
  });
});
