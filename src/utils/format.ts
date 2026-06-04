import type {
  YuqueUser,
  YuqueRepo,
  YuqueDoc,
  YuqueTocItem,
} from '../services/types.js';
import { isSheetDoc } from './doc-type.js';

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
    ...(doc.type && { type: doc.type }),
    format: doc.format,
    public: doc.public === 1,
    word_count: doc.word_count,
    updated_at: doc.updated_at,
  };
}

/** Format full doc data including body content. */
export function formatDoc(doc: YuqueDoc, options?: { includeLake?: boolean }) {
  if (isSheetDoc(doc)) {
    const sheetBody = doc.body_sheet ?? doc.body;
    return {
      ...formatDocSummary(doc),
      body: sheetBody,
      body_sheet: sheetBody,
      body_html: doc.body_html,
      description: doc.description,
      ...(options?.includeLake && doc.body_lake && { body_lake: doc.body_lake }),
    };
  }

  return {
    ...formatDocSummary(doc),
    body: doc.body,
    body_html: doc.body_html,
    description: doc.description,
    ...(options?.includeLake && { body_lake: doc.body_lake }),
  };
}

/**
 * Convert Sheet JSON data to Markdown table format.
 * Returns original data on failure to ensure graceful degradation.
 */
export function formatSheet(doc: YuqueDoc): { formatted: string; success: boolean } {
  try {
    const sheetBody = doc.body_sheet ?? doc.body;
    const sheetData = typeof sheetBody === 'string' ? JSON.parse(sheetBody) : sheetBody;

    if (!sheetData?.data?.[0]?.table) {
      return { formatted: String(sheetBody), success: false };
    }

    const table: string[][] = sheetData.data[0].table;
    const sheetName = sheetData.data[0].name ?? 'Sheet1';

    if (!Array.isArray(table) || table.length === 0) {
      return { formatted: String(sheetBody), success: false };
    }

    // Build Markdown table
    const lines: string[] = [`### ${sheetName}\n`];

    // Header row
    const header = table[0] ?? [];
    lines.push(`| ${header.map(escapeMarkdownCell).join(' | ')} |`);
    lines.push(`| ${header.map(() => '---').join(' | ')} |`);

    // Data rows (skip header)
    for (let i = 1; i < table.length; i++) {
      const row = table[i] ?? [];
      lines.push(`| ${row.map(escapeMarkdownCell).join(' | ')} |`);
    }

    return { formatted: lines.join('\n'), success: true };
  } catch {
    // Graceful degradation: return original data
    return { formatted: String(doc.body_sheet ?? doc.body), success: false };
  }
}

/** Escape pipe characters in Markdown table cells. */
function escapeMarkdownCell(cell: unknown): string {
  return String(cell ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
