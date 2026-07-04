import axios, { type AxiosInstance } from 'axios';
import type {
  YuqueUser,
  YuqueRepo,
  YuqueDoc,
  YuqueYmdDoc,
  YuqueYmdDocWriteResult,
  YuqueTocItem,
  YuqueSearchResult,
  YuqueApiResponse,
  CreateRepoData,
  UpdateRepoData,
  CreateDocData,
  UpdateDocData,
  YuqueNote,
  YuqueNotesResponse,
  CreateNoteData,
  CreateNoteResponse,
  UpdateNoteData,
  YuqueResourceCreateData,
  YuqueResourceGetData,
  YuqueResourceResult,
  YuqueResourceUpdateData,
} from './types.js';
import { handleYuqueError } from '../utils/error.js';

/**
 * Wraps an async operation with standardized Yuque error handling.
 * Every API call goes through this so error handling stays consistent.
 */
async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleYuqueError(error);
  }
}

function toResourcePayload<T extends { resource_type: string }>(data: T): Record<string, unknown> {
  const { resource_type: resourceType, ...payload } = data;
  void resourceType;
  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([, value]) => value !== undefined)
  );
}

function toBoardResourcePayload<T extends { resource_type: string; resource_id?: string }>(
  data: T
): Record<string, unknown> {
  const { resource_id: resourceId, ...payload } = toResourcePayload(data);
  // The public v2 board API names this field src, but expects the raw resource id.
  return {
    ...payload,
    ...(resourceId !== undefined && { src: resourceId }),
  };
}

export class YuqueClient {
  private client: AxiosInstance;

  constructor(token: string, baseURL = 'https://www.yuque.com/api/v2') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
      },
    });
  }

  // ── User APIs ──────────────────────────────────────────────

  /** Get the currently authenticated user. */
  async getUser(): Promise<YuqueUser> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueUser>>('/user');
      return r.data.data;
    });
  }

  // ── Search API ─────────────────────────────────────────────

  /** Search for documents, repos, or users. */
  async search(query: string, type?: string, page?: number): Promise<YuqueSearchResult> {
    return withErrorHandling(async () => {
      const params: { q: string; type?: string; page?: number } = { q: query };
      if (type) params.type = type;
      if (page !== undefined) params.page = page;
      const r = await this.client.get<YuqueApiResponse<YuqueSearchResult>>('/search', { params });
      return r.data.data;
    });
  }

  // ── Repo APIs ──────────────────────────────────────────────

  /** List repos for a user with optional pagination. */
  async listUserRepos(
    login: string,
    options?: { offset?: number; limit?: number }
  ): Promise<YuqueRepo[]> {
    return withErrorHandling(async () => {
      const params: Record<string, number> = {};
      if (options?.offset !== undefined) params.offset = options.offset;
      if (options?.limit !== undefined) params.limit = options.limit;
      const r = await this.client.get<YuqueApiResponse<YuqueRepo[]>>(`/users/${login}/repos`, {
        params,
      });
      return r.data.data;
    });
  }

  /** Get a repo by ID or namespace (e.g. "group/book"). */
  async getRepo(idOrNamespace: string | number): Promise<YuqueRepo> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueRepo>>(`/repos/${idOrNamespace}`);
      return r.data.data;
    });
  }

  /** Create a new repo under a user. */
  async createUserRepo(login: string, data: CreateRepoData): Promise<YuqueRepo> {
    return withErrorHandling(async () => {
      const r = await this.client.post<YuqueApiResponse<YuqueRepo>>(`/users/${login}/repos`, data);
      return r.data.data;
    });
  }

  /** Update a repo by ID or namespace. */
  async updateRepo(idOrNamespace: string | number, data: UpdateRepoData): Promise<YuqueRepo> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueRepo>>(`/repos/${idOrNamespace}`, data);
      return r.data.data;
    });
  }

  // ── Doc APIs ───────────────────────────────────────────────

  /** List documents in a repo with optional pagination (the API caps limit at 100). */
  async listDocs(
    repoId: string | number,
    options?: { offset?: number; limit?: number }
  ): Promise<YuqueDoc[]> {
    return withErrorHandling(async () => {
      const params: Record<string, number> = {};
      if (options?.offset !== undefined) params.offset = options.offset;
      if (options?.limit !== undefined) params.limit = options.limit;
      const r = await this.client.get<YuqueApiResponse<YuqueDoc[]>>(`/repos/${repoId}/docs`, {
        params,
      });
      return r.data.data;
    });
  }

  /** Get a single document by repo and doc ID/slug. */
  async getDoc(repoId: string | number, docId: string | number): Promise<YuqueDoc> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueDoc>>(`/repos/${repoId}/docs/${docId}`);
      return r.data.data;
    });
  }

  /** Get a document body through the YMD/YFM-compatible reader. */
  async getYmdDoc(docId: number): Promise<YuqueYmdDoc> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueYmdDoc>>('/yfm/docs', {
        params: { doc_id: docId },
      });
      return r.data.data;
    });
  }

  /** Create a new document in a repo. */
  async createDoc(repoId: string | number, data: CreateDocData): Promise<YuqueDoc> {
    return withErrorHandling(async () => {
      const r = await this.client.post<YuqueApiResponse<YuqueDoc>>(`/repos/${repoId}/docs`, data);
      return r.data.data;
    });
  }

  /** Update an existing document. */
  async updateDoc(
    repoId: string | number,
    docId: string | number,
    data: UpdateDocData
  ): Promise<YuqueDoc> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueDoc>>(
        `/repos/${repoId}/docs/${docId}`,
        data
      );
      return r.data.data;
    });
  }

  /** Update a document body through the YMD/YFM-compatible writer. */
  async updateYmdDoc(docId: number, ymd: string): Promise<YuqueYmdDocWriteResult> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueYmdDocWriteResult>>('/yfm/docs', {
        doc_id: docId,
        yfm: ymd,
      });
      return r.data.data;
    });
  }

  /** Get a structured resource view from a document. */
  async getResource(data: YuqueResourceGetData): Promise<YuqueResourceResult> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueResourceResult>>('/yfm/boards', {
        params: toBoardResourcePayload(data),
      });
      return r.data.data;
    });
  }

  /** Create a structured resource in a document. */
  async createResource(data: YuqueResourceCreateData): Promise<YuqueResourceResult> {
    return withErrorHandling(async () => {
      const r = await this.client.post<YuqueApiResponse<YuqueResourceResult>>(
        '/yfm/boards',
        toResourcePayload(data)
      );
      return r.data.data;
    });
  }

  /** Update a structured resource in a document. */
  async updateResource(data: YuqueResourceUpdateData): Promise<YuqueResourceResult> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueResourceResult>>(
        '/yfm/boards',
        toBoardResourcePayload(data)
      );
      return r.data.data;
    });
  }

  // ── TOC APIs ───────────────────────────────────────────────

  /** Get the table of contents for a repo. */
  async getToc(repoId: string | number): Promise<YuqueTocItem[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueTocItem[]>>(`/repos/${repoId}/toc`);
      return r.data.data;
    });
  }

  /** Update the table of contents for a repo. */
  async updateToc(repoId: string | number, data: string): Promise<YuqueTocItem[]> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueTocItem[]>>(
        `/repos/${repoId}/toc`,
        data
      );
      return r.data.data;
    });
  }

  // ── Note APIs ──────────────────────────────────────────────

  /** List all notes (小记) for the current user with pagination. */
  async listNotes(status?: number, page?: number, limit?: number): Promise<YuqueNotesResponse> {
    return withErrorHandling(async () => {
      const params: Record<string, number> = {};
      if (status !== undefined) params.status = status;
      if (page !== undefined) params.page = page;
      if (limit !== undefined) params.limit = limit;
      const r = await this.client.get<YuqueApiResponse<YuqueNotesResponse>>('/notes', { params });
      return r.data.data;
    });
  }

  /** Get a specific note by ID. */
  async getNote(noteId: number): Promise<YuqueNote> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueNote>>(`/notes/${noteId}`);
      return r.data.data;
    });
  }

  /** Create a new note. */
  async createNote(data: CreateNoteData): Promise<CreateNoteResponse> {
    return withErrorHandling(async () => {
      const r = await this.client.post<{ success: boolean; data: CreateNoteResponse }>(
        '/notes',
        data
      );
      return r.data.data;
    });
  }

  /** Update an existing note. */
  async updateNote(noteId: number, data: UpdateNoteData): Promise<YuqueNote> {
    return withErrorHandling(async () => {
      // Unlike other endpoints, PUT /notes/:id wraps the note in an extra
      // envelope: the HTTP body is { data: { data: <note> } }.
      const r = await this.client.put<{ data: { data: YuqueNote } }>(`/notes/${noteId}`, data);
      return r.data.data.data;
    });
  }
}
