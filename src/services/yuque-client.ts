import axios, { type AxiosInstance } from 'axios';
import type {
  YuqueUser,
  YuqueGroup,
  YuqueRepo,
  YuqueDoc,
  YuqueTocItem,
  YuqueSearchResult,
  YuqueDocVersion,
  YuqueGroupMember,
  YuqueStatistics,
  YuqueApiResponse,
  CreateRepoData,
  UpdateRepoData,
  CreateDocData,
  UpdateDocData,
  YuqueNote,
  YuqueNotesResponse,
  CreateNoteData,
  UpdateNoteData,
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

export class YuqueClient {
  private client: AxiosInstance;

  constructor(token: string, baseURL = 'https://www.yuque.com/api/v2') {
    this.client = axios.create({
      baseURL,
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

  /** List groups/teams that a user belongs to. */
  async listGroups(userId: number): Promise<YuqueGroup[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueGroup[]>>(`/users/${userId}/groups`);
      return r.data.data;
    });
  }

  // ── Search API ─────────────────────────────────────────────

  /** Search for documents, repos, or users. */
  async search(query: string, type?: string): Promise<YuqueSearchResult> {
    return withErrorHandling(async () => {
      const params: { q: string; type?: string } = { q: query };
      if (type) params.type = type;
      const r = await this.client.get<YuqueApiResponse<YuqueSearchResult>>('/search', { params });
      return r.data.data;
    });
  }

  // ── Repo APIs ──────────────────────────────────────────────

  /** List all repos for a user. */
  async listUserRepos(login: string): Promise<YuqueRepo[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueRepo[]>>(`/users/${login}/repos`);
      return r.data.data;
    });
  }

  /** List all repos for a group. */
  async listGroupRepos(login: string): Promise<YuqueRepo[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueRepo[]>>(`/groups/${login}/repos`);
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

  /** Create a new repo under a group. */
  async createGroupRepo(login: string, data: CreateRepoData): Promise<YuqueRepo> {
    return withErrorHandling(async () => {
      const r = await this.client.post<YuqueApiResponse<YuqueRepo>>(`/groups/${login}/repos`, data);
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

  /** Delete a repo by ID or namespace. */
  async deleteRepo(idOrNamespace: string | number): Promise<void> {
    return withErrorHandling(async () => {
      await this.client.delete(`/repos/${idOrNamespace}`);
    });
  }

  // ── Doc APIs ───────────────────────────────────────────────

  /** List all documents in a repo. */
  async listDocs(repoId: string | number): Promise<YuqueDoc[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueDoc[]>>(`/repos/${repoId}/docs`);
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

  /** Create a new document in a repo. */
  async createDoc(repoId: string | number, data: CreateDocData): Promise<YuqueDoc> {
    return withErrorHandling(async () => {
      const r = await this.client.post<YuqueApiResponse<YuqueDoc>>(`/repos/${repoId}/docs`, data);
      return r.data.data;
    });
  }

  /** Update an existing document. */
  async updateDoc(repoId: string | number, docId: string | number, data: UpdateDocData): Promise<YuqueDoc> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueDoc>>(`/repos/${repoId}/docs/${docId}`, data);
      return r.data.data;
    });
  }

  /** Delete a document. */
  async deleteDoc(repoId: string | number, docId: string | number): Promise<void> {
    return withErrorHandling(async () => {
      await this.client.delete(`/repos/${repoId}/docs/${docId}`);
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
      const r = await this.client.put<YuqueApiResponse<YuqueTocItem[]>>(`/repos/${repoId}/toc`, data);
      return r.data.data;
    });
  }

  // ── Doc Version APIs ───────────────────────────────────────

  /** List all versions of a document. */
  async listDocVersions(docId: number): Promise<YuqueDocVersion[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueDocVersion[]>>('/doc_versions', {
        params: { doc_id: docId },
      });
      return r.data.data;
    });
  }

  /** Get a specific version of a document. */
  async getDocVersion(versionId: number): Promise<YuqueDocVersion> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueDocVersion>>(`/doc_versions/${versionId}`);
      return r.data.data;
    });
  }

  // ── Group Member APIs ──────────────────────────────────────

  /** List all members of a group. */
  async listGroupMembers(login: string): Promise<YuqueGroupMember[]> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueGroupMember[]>>(`/groups/${login}/users`);
      return r.data.data;
    });
  }

  /** Update a group member's role. */
  async updateGroupMember(login: string, userId: number, data: { role: number }): Promise<YuqueGroupMember> {
    return withErrorHandling(async () => {
      const r = await this.client.put<YuqueApiResponse<YuqueGroupMember>>(`/groups/${login}/users/${userId}`, data);
      return r.data.data;
    });
  }

  /** Remove a member from a group. */
  async removeGroupMember(login: string, userId: number): Promise<void> {
    return withErrorHandling(async () => {
      await this.client.delete(`/groups/${login}/users/${userId}`);
    });
  }

  // ── Statistics APIs ────────────────────────────────────────

  /** Get overall statistics for a group. */
  async getGroupStats(login: string): Promise<YuqueStatistics> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<YuqueStatistics>>(`/groups/${login}/statistics`);
      return r.data.data;
    });
  }

  /** Get member statistics for a group. */
  async getGroupMemberStats(login: string): Promise<unknown> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<unknown>>(`/groups/${login}/statistics/members`);
      return r.data.data;
    });
  }

  /** Get book/repo statistics for a group. */
  async getGroupBookStats(login: string): Promise<unknown> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<unknown>>(`/groups/${login}/statistics/books`);
      return r.data.data;
    });
  }

  /** Get document statistics for a group. */
  async getGroupDocStats(login: string): Promise<unknown> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<unknown>>(`/groups/${login}/statistics/docs`);
      return r.data.data;
    });
  }

  // ── Hello API ──────────────────────────────────────────────

  /** Test API connectivity. */
  async hello(): Promise<{ message: string }> {
    return withErrorHandling(async () => {
      const r = await this.client.get<YuqueApiResponse<{ message: string }>>('/hello');
      return r.data.data;
    });
  }

  // ── Note APIs ──────────────────────────────────────────────

  /** List all notes (小记) for the current user. */
  async listNotes(status?: number): Promise<YuqueNotesResponse> {
    return withErrorHandling(async () => {
      const params = status !== undefined ? { status } : {};
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
  async createNote(data: CreateNoteData): Promise<{ note_url: string }> {
    return withErrorHandling(async () => {
      const r = await this.client.post<{ success: boolean; data: { note_url: string } }>('/notes', data);
      return r.data.data;
    });
  }

  /** Update an existing note. */
  async updateNote(noteId: number, data: UpdateNoteData): Promise<YuqueNote> {
    return withErrorHandling(async () => {
      const r = await this.client.put<{ data: { data: YuqueNote } }>(`/notes/${noteId}`, data);
      return r.data.data.data;
    });
  }

  /** Delete a note (move to trash). */
  async deleteNote(noteId: number): Promise<void> {
    return withErrorHandling(async () => {
      const note = await this.getNote(noteId);
      const data: UpdateNoteData = {
        source: note.content.source || '',
        html: note.content.html || '',
        abstract: note.content.abstract || '',
        status: 9,
      };
      await this.client.put(`/notes/${noteId}`, data);
    });
  }

  /** Restore a note from trash. */
  async restoreNote(noteId: number): Promise<void> {
    return withErrorHandling(async () => {
      const note = await this.getNote(noteId);
      const data: UpdateNoteData = {
        source: note.content.source || '',
        html: note.content.html || '',
        abstract: note.content.abstract || '',
        status: 0,
      };
      await this.client.put(`/notes/${noteId}`, data);
    });
  }
}