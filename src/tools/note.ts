import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import type { YuqueNote } from '../services/types.js';

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

/** Convert plain text to Yuque Lake format (XML-like rich text format). */
function textToLakeFormat(text: string): { source: string; html: string; abstract: string } {
  const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    source: `<!doctype lake><meta name="doc-version" content="1" /><meta name="viewport" content="fixed" /><meta name="typography" content="classic" /><p><span>${escapedText}</span></p>`,
    html: `<!doctype html><div class="lake-content"><p><span>${escapedText}</span></p></div>`,
    abstract: `<!doctype lake><meta name="doc-version" content="1" /><p><span>${escapedText}</span></p>`,
  };
}

export const noteTools = {
  yuque_list_notes: {
    description: 'List all notes (小记) for the current user',
    inputSchema: z.object({
      status: z.number().optional().describe('Filter by status: 0 (normal), 9 (deleted)'),
    }),
    handler: async (client: YuqueClient, args: { status?: number }) => {
      const result = await client.listNotes(args.status);
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
    description: 'Update an existing note',
    inputSchema: z.object({
      note_id: z.number().describe('Note ID'),
      body: z.string().describe('New note content (plain text)'),
    }),
    handler: async (client: YuqueClient, args: { note_id: number; body: string }) => {
      const lakeFormat = textToLakeFormat(args.body);
      const note = await client.updateNote(args.note_id, lakeFormat);
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

  yuque_delete_note: {
    description: 'Delete a note (move to trash)',
    inputSchema: z.object({
      note_id: z.number().describe('Note ID'),
    }),
    handler: async (client: YuqueClient, args: { note_id: number }) => {
      await client.deleteNote(args.note_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Note deleted successfully (moved to trash)',
          },
        ],
      };
    },
  },

  yuque_restore_note: {
    description: 'Restore a note from trash',
    inputSchema: z.object({
      note_id: z.number().describe('Note ID'),
    }),
    handler: async (client: YuqueClient, args: { note_id: number }) => {
      await client.restoreNote(args.note_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Note restored successfully',
          },
        ],
      };
    },
  },
};
