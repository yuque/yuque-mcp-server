import type {
  YuqueUser,
  YuqueRepo,
  YuqueDoc,
  YuqueYmdDoc,
  YuqueYmdDocWriteResult,
  YuqueTocItem,
  YuqueSearchResult,
} from '../services/types.js';
import { isSheetDoc, sheetSource } from './doc-type.js';

/** Format user data — strips fields that are noisy for AI consumption. */
export function formatUser(user: YuqueUser) {
  return {
    id: user.id,
    login: user.login,
    name: user.name,
    description: user.description,
    avatar_url: user.avatar_url,
    books_count: user.books_count,
    followers_count: user.followers_count,
  };
}

/** Format repo data — converts numeric `public` field to boolean. */
export function formatRepo(repo: YuqueRepo) {
  return {
    id: repo.id,
    slug: repo.slug,
    name: repo.name,
    namespace: repo.namespace,
    description: repo.description,
    public: repo.public === 1,
    items_count: repo.items_count,
    updated_at: repo.updated_at,
  };
}

/** Format doc summary — excludes body to reduce token usage. */
export function formatDocSummary(doc: YuqueDoc) {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    ...(doc.type !== undefined && { type: doc.type }),
    format: doc.format,
    public: doc.public === 1,
    word_count: doc.word_count,
    updated_at: doc.updated_at,
  };
}

/** Format full doc data including body content. */
export function formatDoc(doc: YuqueDoc, options?: { includeLake?: boolean }) {
  const common = {
    ...formatDocSummary(doc),
    body_html: doc.body_html,
    description: doc.description,
    ...(options?.includeLake && { body_lake: doc.body_lake }),
  };

  // 表格 documents keep their cells in body_sheet; expose them as a Markdown table.
  if (isSheetDoc(doc)) {
    const raw = sheetSource(doc);
    const { formatted, success } = formatSheet(doc);
    return {
      ...common,
      body: success ? formatted : raw,
      ...(success ? {} : { body_sheet: raw }),
      format_note: success
        ? 'Sheet formatted as a Markdown table'
        : 'Raw sheet data (Markdown table formatting failed)',
    };
  }

  return {
    ...common,
    body: doc.body,
    // 数据表 documents keep their records in body_table, next to a body holding the schema.
    ...(doc.body_table !== undefined && { body_table: doc.body_table }),
  };
}

/**
 * Convert a 表格 (Sheet) body_sheet payload into Markdown tables, one per tab.
 * Falls back to the raw payload when nothing is renderable.
 */
export function formatSheet(doc: YuqueDoc): { formatted: string; success: boolean } {
  const raw = sheetSource(doc);

  try {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const tabs = Array.isArray((parsed as { data?: unknown })?.data)
      ? ((parsed as { data: unknown[] }).data as unknown[])
      : [];

    const blocks: string[] = [];
    const nameCounts = new Map<string, number>();

    for (const tab of tabs) {
      const rawTable = (tab as { table?: unknown } | null)?.table;
      const rows = (Array.isArray(rawTable) ? rawTable : [])
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => [...row]);

      // Sheets often start with blank spacer rows; the header is the first row with content.
      while (rows.length > 0 && isBlankRow(rows[0])) rows.shift();
      while (rows.length > 0 && isBlankRow(rows[rows.length - 1])) rows.pop();
      if (rows.length === 0) continue;

      // Pad every row to the widest row so the table never loses or shifts cells.
      const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
      const cells = rows.map((row) =>
        Array.from({ length: width }, (_, index) => escapeMarkdownCell(row[index]))
      );
      const [header, ...body] = cells;

      const baseName = String((tab as { name?: unknown } | null)?.name ?? '').trim() || 'Sheet1';
      const seen = nameCounts.get(baseName) ?? 0;
      nameCounts.set(baseName, seen + 1);
      const name = seen === 0 ? baseName : `${baseName} (${seen + 1})`;

      blocks.push(
        [
          `### ${name}`,
          '',
          `| ${header.join(' | ')} |`,
          `| ${header.map(() => '---').join(' | ')} |`,
          ...body.map((row) => `| ${row.join(' | ')} |`),
        ].join('\n')
      );
    }

    if (blocks.length === 0) return { formatted: raw, success: false };
    return { formatted: blocks.join('\n\n'), success: true };
  } catch {
    return { formatted: raw, success: false };
  }
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '');
}

/** Escape a cell so it cannot break the surrounding Markdown table. */
function escapeMarkdownCell(cell: unknown): string {
  return String(cell ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/** Format a YMD markdown doc view. */
export function formatYmdDoc(doc: YuqueYmdDoc) {
  return {
    id: doc.doc_id,
    title: doc.title,
    url: doc.url,
    format: 'markdown',
    body: doc.yfm,
    updated_at: doc.updated_at,
  };
}

/** Format the result of a YMD markdown doc write. */
export function formatYmdDocWriteResult(result: YuqueYmdDocWriteResult) {
  return {
    id: result.doc_id,
    title: result.title,
    url: result.url,
    updated_at: result.updated_at,
  };
}

/** Strip Yuque search highlight tags (<em>) and other HTML from a snippet. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/** Format search results — strips highlight markup and trims to essential fields. */
export function formatSearchResult(result: YuqueSearchResult | null | undefined) {
  if (!result || !Array.isArray(result.items)) {
    return { total: 0, items: [] };
  }
  return {
    total: result.total,
    items: result.items.map((item) => ({
      id: item.id,
      type: item.type,
      title: stripHtml(item.title ?? ''),
      summary: stripHtml(item.body ?? ''),
      url: item.url,
      ...(item.book && { book: item.book }),
      updated_at: item.updated_at,
    })),
  };
}

/** Format TOC items — flattens to essential navigation fields. */
export function formatToc(items: YuqueTocItem[]) {
  return items.map((item) => ({
    title: item.title,
    uuid: item.uuid,
    doc_id: item.doc_id,
    level: item.level,
    visible: item.visible === 1,
  }));
}
