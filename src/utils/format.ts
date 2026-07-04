import type {
  YuqueUser,
  YuqueRepo,
  YuqueDoc,
  YuqueYmdDoc,
  YuqueYmdDocWriteResult,
  YuqueTocItem,
  YuqueSearchResult,
} from '../services/types.js';

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
    format: doc.format,
    public: doc.public === 1,
    word_count: doc.word_count,
    updated_at: doc.updated_at,
  };
}

/** Format full doc data including body content. */
export function formatDoc(doc: YuqueDoc, options?: { includeLake?: boolean }) {
  return {
    ...formatDocSummary(doc),
    body: doc.body,
    body_html: doc.body_html,
    description: doc.description,
    ...(options?.includeLake && { body_lake: doc.body_lake }),
  };
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
