// Yuque API Type Definitions

export interface YuqueUser {
  id: number;
  type: string;
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  books_count: number;
  public_books_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface YuqueGroup {
  id: number;
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  books_count: number;
  public_books_count: number;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface YuqueRepo {
  id: number;
  type: string;
  slug: string;
  name: string;
  namespace: string;
  user_id: number;
  user?: YuqueUser;
  description: string;
  creator_id: number;
  public: number;
  items_count: number;
  likes_count: number;
  watches_count: number;
  content_updated_at: string;
  updated_at: string;
  created_at: string;
}

export interface YuqueDoc {
  id: number;
  slug: string;
  title: string;
  book_id: number;
  book?: YuqueRepo;
  user_id: number;
  user?: YuqueUser;
  format: string;
  body: string;
  body_draft: string;
  body_html: string;
  body_lake: string;
  creator_id: number;
  public: number;
  status: number;
  likes_count: number;
  comments_count: number;
  content_updated_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string;
  first_published_at: string;
  word_count: number;
  cover: string | null;
  description: string;
}

export interface YuqueTocItem {
  title: string;
  uuid: string;
  url: string;
  prev_uuid: string;
  sibling_uuid: string;
  child_uuid: string;
  parent_uuid: string;
  doc_id: number;
  level: number;
  id: number;
  open_window: number;
  visible: number;
}

export interface YuqueSearchResult {
  items: Array<{
    id: number;
    type: string;
    title: string;
    url: string;
    body: string;
    book?: {
      id: number;
      name: string;
      namespace: string;
    };
    created_at: string;
    updated_at: string;
  }>;
  total: number;
}

export interface YuqueDocVersion {
  id: number;
  doc_id: number;
  title: string;
  body: string;
  body_draft: string;
  format: string;
  user_id: number;
  user?: YuqueUser;
  created_at: string;
}

export interface YuqueGroupMember {
  id: number;
  group_id: number;
  user_id: number;
  user?: YuqueUser;
  role: number;
  created_at: string;
  updated_at: string;
}

export interface YuqueStatistics {
  books_count: number;
  docs_count: number;
  members_count: number;
  public_books_count: number;
  public_docs_count: number;
}

export interface YuqueApiResponse<T> {
  data: T;
}

export interface YuqueApiError {
  message: string;
  status?: number;
}

/** Data for creating a repo/book. */
export interface CreateRepoData {
  name: string;
  slug: string;
  description?: string;
  public?: number;
  type?: string;
}

/** Data for updating a repo/book. */
export interface UpdateRepoData {
  name?: string;
  slug?: string;
  description?: string;
  public?: number;
}

/** Data for creating a document. */
export interface CreateDocData {
  title: string;
  slug?: string;
  body?: string;
  format?: string;
  public?: number;
}

/** Data for updating a document. */
export interface UpdateDocData {
  title?: string;
  slug?: string;
  body?: string;
  public?: number;
}
// 添加到 src/services/types.ts 的小记类型定义

export interface YuqueNoteContent {
  updated_at: string;
  abstract: string;
  format?: string;
  source?: string;
  html?: string;
  draft_version?: number;
  doc_dynamic_data?: any[];
}

export interface YuqueNote {
  id: number;
  slug: string;
  doclet_id: number;
  user_id: number;
  content: YuqueNoteContent;
  published_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pinned_at: string | null;
  status: number;
  save_from: string | null;
  public: number;
  likes_count: number;
  comments_count: number;
  has_image: boolean;
  has_attachment: boolean;
  has_bookmark: boolean;
  word_count: number;
  tags: string[];
  share_expired_time: string | null;
}

export interface YuqueNotesResponse {
  pin_notes: YuqueNote[];
  notes: YuqueNote[];
  has_more: boolean;
}

export interface CreateNoteData {
  body: string;
}

export interface CreateNoteResponse {
  id: number;
  slug: string;
  note_url: string;
}

export interface UpdateNoteData {
  source?: string;
  html?: string;
  abstract?: string;
  body?: string;
  status?: number;
}
