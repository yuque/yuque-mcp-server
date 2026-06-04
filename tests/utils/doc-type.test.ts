import { describe, it, expect } from 'vitest';
import {
  isSheetDoc,
  shouldSkipYmdForDoc,
  shouldUseYmdForDoc,
  assertDocBodyWritable,
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
  body: '',
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
  it('detects sheet by format or type', () => {
    expect(isSheetDoc({ ...baseDoc, format: 'lakesheet' })).toBe(true);
    expect(isSheetDoc({ ...baseDoc, type: 'Sheet', format: 'markdown' })).toBe(true);
    expect(isSheetDoc(baseDoc)).toBe(false);
  });

  it('skips YMD for sheet and other legacy-only types', () => {
    expect(shouldSkipYmdForDoc({ ...baseDoc, format: 'lakesheet' })).toBe(true);
    expect(shouldSkipYmdForDoc({ ...baseDoc, type: 'Table' })).toBe(true);
    expect(shouldSkipYmdForDoc(baseDoc)).toBe(false);
  });

  it('uses YMD only for compatible markdown docs', () => {
    expect(shouldUseYmdForDoc(baseDoc)).toBe(true);
    expect(shouldUseYmdForDoc(baseDoc, 'lake')).toBe(false);
    expect(shouldUseYmdForDoc({ ...baseDoc, format: 'lakesheet' })).toBe(false);
    expect(shouldUseYmdForDoc({ ...baseDoc, format: 'lakesheet' }, 'markdown')).toBe(false);
  });

  it('rejects body writes for sheet docs', () => {
    expect(() => assertDocBodyWritable({ ...baseDoc, format: 'lakesheet' })).toThrow(YuqueError);
    expect(() => assertCreateFormatSupported('lakesheet')).toThrow(YuqueError);
  });
});
