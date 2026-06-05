import type { YuqueDoc } from '../services/types.js';
import { YuqueError } from './error.js';

/** Content formats that must use the legacy GET /docs API instead of /yfm/docs. */
const LEGACY_ONLY_FORMATS = new Set(['lakesheet']);

/** Document types that do not support the YFM (/yfm/docs) markdown read/write flow. */
const LEGACY_ONLY_TYPES = new Set(['Sheet', 'Table', 'Board', 'Thread']);

export function isSheetDoc(doc: YuqueDoc): boolean {
  return doc.format === 'lakesheet' || doc.type === 'Sheet';
}

/** True when the document must not use /yfm/docs (Sheet, Table, Board, Thread, lakesheet, etc.). */
export function shouldSkipYmdForDoc(doc: YuqueDoc): boolean {
  return LEGACY_ONLY_FORMATS.has(doc.format) || (doc.type != null && LEGACY_ONLY_TYPES.has(doc.type));
}

export function shouldUseYmdForDoc(doc: YuqueDoc, format?: string): boolean {
  const wantsYmd = !format || format === 'markdown';
  return wantsYmd && !shouldSkipYmdForDoc(doc);
}

export function assertDocBodyWritable(doc: YuqueDoc): never | void {
  if (!shouldSkipYmdForDoc(doc)) {
    return;
  }
  const kind = doc.type ?? doc.format;
  throw new YuqueError(
    `Cannot update body for Yuque document type "${kind}". ` +
      'The Open API only supports markdown/lake/html body writes for regular documents (type Doc). ' +
      'You may still update metadata (title, slug, public) via yuque_update_doc.'
  );
}

export function assertCreateFormatSupported(format?: string): never | void {
  if (format === 'lakesheet') {
    throw new YuqueError(
      'Cannot create Sheet documents via API. Supported create formats: markdown, lake, html.'
    );
  }
}
