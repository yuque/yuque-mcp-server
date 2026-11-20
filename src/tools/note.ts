import { z } from 'zod';
import { marked } from 'marked';
import type { YuqueClient } from '../services/yuque-client.js';
import type { YuqueNote } from '../services/types.js';

/**
 * PUT /notes/:id requires source, html and abstract together. createNote accepts markdown and
 * lets the API render it, so the update path has to render the same markdown itself —
 * otherwise headings, lists and links show up as literal text in the note.
 */
export function renderNoteBody(markdown: string): { html: string; abstract: string } {
  const html = marked.parse(markdown, { async: false }).trim();
  const abstract = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return { html, abstract };
}

/** Format note summary — excludes full content to reduce token usage. */
function formatNoteSummary(note: YuqueNote) {
  return {
    id: note.id,
    slug: note.slug,
    content_preview: note.content?.abstract?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
    word_count: note.word_count,
    tags: note.tags,
    created_at: note.created_at,
    updated_at: note.updated_at,
    is_pinned: !!note.pinned_at,
    status: note.status,
  };
}

/** Format full note data including content. */
function formatNote(note: YuqueNote) {
  return {
    id: note.id,
    slug: note.slug,
    content: {
      text: note.content?.source || note.content?.abstract || '',
      html: note.content?.html || '',
    },
    word_count: note.word_count,
    tags: note.tags,
    created_at: note.created_at,
    updated_at: note.updated_at,
    published_at: note.published_at,
    is_pinned: !!note.pinned_at,
    likes_count: note.likes_count,
    comments_count: note.comments_count,
    status: note.status,
  };
}

export const noteTools = {
  yuque_list_notes: {
    description: 'List all notes (小记) for the current user with pagination',
    inputSchema: z.object({
      status: z.number().optional().describe('Filter by status: 0 (normal), 9 (deleted)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Number of notes per page (default: 20)'),
    }),
    handler: async (
      client: YuqueClient,
      args: { status?: number; page?: number; limit?: number }
    ) => {
      const result = await client.listNotes(args.status, args.page, args.limit);
      const allNotes = [...result.pin_notes, ...result.notes];
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                total: allNotes.length,
                pinned: result.pin_notes.length,
                has_more: result.has_more,
                notes: allNotes.map(formatNoteSummary),
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },

  yuque_get_note: {
    description: 'Get a specific note with full content',
    inputSchema: z.object({
      note_id: z.number().describe('Note ID'),
    }),
    handler: async (client: YuqueClient, args: { note_id: number }) => {
      const note = await client.getNote(args.note_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatNote(note), null, 2),
          },
        ],
      };
    },
  },

  yuque_create_note: {
    description: 'Create a new note (小记)',
    inputSchema: z.object({
      body: z.string().describe('Note content (plain text or markdown)'),
    }),
    handler: async (client: YuqueClient, args: { body: string }) => {
      const result = await client.createNote({ body: args.body });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                id: result.id,
                slug: result.slug,
                note_url: result.note_url,
                message: 'Note created successfully',
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },

  yuque_update_note: {
    description:
      'Update an existing note: replace its content and/or archive or restore it. Provide body to rewrite the content (markdown), status to archive (archived) or restore (unarchived); at least one of them is required.',
    inputSchema: z
      .object({
        note_id: z.number().describe('Note ID'),
        body: z.string().optional().describe('New note content (plain text or markdown)'),
        status: z
          .enum(['unarchived', 'archived'])
          .optional()
          .describe('archived removes the note from the inbox, unarchived restores it'),
      })
      .refine((value) => value.body !== undefined || value.status !== undefined, {
        message: 'Provide body, status, or both',
        path: ['body'],
      }),
    handler: async (
      client: YuqueClient,
      args: { note_id: number; body?: string; status?: 'unarchived' | 'archived' }
    ) => {
      if (args.body === undefined && args.status === undefined) {
        throw new Error('yuque_update_note requires body, status, or both');
      }
      // PUT /notes/:id always needs the full content, so an archive-only update reuses the
      // note's current source/html/abstract instead of asking the caller to resend the body.
      const current = args.body === undefined ? await client.getNote(args.note_id) : undefined;
      const content =
        args.body === undefined
          ? {
              source: current?.content?.source ?? '',
              html: current?.content?.html ?? '',
              abstract: current?.content?.abstract ?? '',
            }
          : { source: args.body, ...renderNoteBody(args.body) };
      const note = await client.updateNote(args.note_id, {
        source: content.source,
        html: content.html,
        abstract: content.abstract,
        ...(args.status !== undefined && { status: args.status }),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatNote(note), null, 2),
          },
        ],
      };
    },
  },
};
