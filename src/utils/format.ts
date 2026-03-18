import type {
  YuqueUser,
  YuqueRepo,
  YuqueDoc,
  YuqueTocItem,
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
export function formatDoc(doc: YuqueDoc) {
  return {
    ...formatDocSummary(doc),
    body: doc.body,
    body_html: doc.body_html,
    description: doc.description,
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
