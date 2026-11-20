import type { YuqueDoc } from '../services/types.js';
import { YuqueError } from './error.js';

/**
 * Document types whose body does not live in the markdown / YFM flow.
 * Sheet is a 表格, Table a 数据表, Board a 图集 and Thread a 话题.
 * Their content comes from the legacy document API (body_sheet / body_table), not /yfm/docs.
 */
const NON_MARKDOWN_TYPES = new Set(['Sheet', 'Table', 'Board', 'Thread']);

/** Legacy content formats that carry their body outside the markdown `body` field. */
const NON_MARKDOWN_FORMATS = new Set(['lakesheet', 'laketable']);

/** True when the document must not go through the YMD markdown read/write APIs. */
export function isNonMarkdownDoc(doc: Pick<YuqueDoc, 'type' | 'format'>): boolean {
  return (
    NON_MARKDOWN_FORMATS.has(doc.format) ||
    (doc.type !== undefined && NON_MARKDOWN_TYPES.has(doc.type))
  );
}

/** True for 表格 documents, whose cell data is in `body_sheet`. */
export function isSheetDoc(doc: Pick<YuqueDoc, 'type' | 'format'>): boolean {
  return doc.format === 'lakesheet' || doc.type === 'Sheet';
}

/** True for 数据表 documents, whose records are in `body_table`. */
export function isTableDoc(doc: Pick<YuqueDoc, 'type' | 'format'>): boolean {
  return doc.format === 'laketable' || doc.type === 'Table';
}

/** Raw sheet payload — `body_sheet` when the API returns it, `body` as a fallback. */
export function sheetSource(doc: YuqueDoc): string {
  return doc.body_sheet ?? doc.body;
}

/** Raw table payload — `body_table` when the API returns it. */
export function tableSource(doc: YuqueDoc): string | undefined {
  return doc.body_table;
}

/** Reject body writes on document types that the Open API cannot rewrite. */
export function assertBodyWritable(doc: YuqueDoc): void {
  if (!isNonMarkdownDoc(doc)) return;

  const kind = doc.type ?? doc.format;
  throw new YuqueError(
    `Cannot update the body of a "${kind}" document: the Open API only supports markdown/lake/html ` +
      'body writes for regular documents (type Doc). Update metadata only (title, slug, public), ' +
      'or edit the document in the Yuque web editor.'
  );
}

/** Reject create formats that the Open API cannot create. */
export function assertCreateFormatSupported(format?: string): void {
  if (format === 'lakesheet' || format === 'laketable') {
    throw new YuqueError(
      `Cannot create "${format}" documents via the Open API. Supported create formats: markdown, lake, html.`
    );
  }
}
