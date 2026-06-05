import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import type { YuqueDoc, YuqueYmdDoc } from '../services/types.js';
import { formatDocSummary, formatDoc, formatSheet } from '../utils/format.js';
import {
  assertCreateFormatSupported,
  assertDocBodyWritable,
  shouldUseYmdForDoc,
  isSheetDoc,
} from '../utils/doc-type.js';

async function appendDocToToc(
  client: YuqueClient,
  repoId: string | number,
  docId: number
): Promise<string | null> {
  try {
    const tocData = JSON.stringify({
      action: 'appendNode',
      action_mode: 'child',
      target_uuid: '',
      type: 'DOC',
      doc_id: docId,
    });
    await client.updateToc(repoId, tocData);
    return null; // success
  } catch {
    return 'Document created successfully but failed to auto-append to TOC. Please manually arrange it in the TOC via the Yuque web interface.';
  }
}

function withYmdBody(doc: YuqueDoc, ymdDoc: YuqueYmdDoc): YuqueDoc {
  return {
    ...doc,
    title: ymdDoc.title || doc.title,
    body: ymdDoc.yfm,
    format: 'markdown',
    updated_at: ymdDoc.updated_at || doc.updated_at,
  };
}

export const docTools = {
  yuque_list_docs: {
    description: 'List all documents in a repo/book',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
    }),
    handler: async (client: YuqueClient, args: { repo_id: string | number }) => {
      const docs = await client.listDocs(args.repo_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(docs.map(formatDocSummary), null, 2),
          },
        ],
      };
    },
  },

  yuque_get_doc: {
    description:
      'Get a specific document with full content. Sheet documents (lakesheet) are read via the legacy docs API with body_sheet; they do not use /yfm/docs.',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      doc_id: z
        .union([z.string(), z.number()])
        .describe('Document ID or slug'),
      format: z
        .enum(['markdown', 'lake', 'html'])
        .optional()
        .describe(
          'Content format to read. Omit or use markdown to read through the YMD-compatible flow; use lake/html for the legacy document API.'
        ),
      include_lake: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Include raw Lake format body (preserves Mermaid source code, diagrams, etc.)'
        ),
    }),
    handler: async (
      client: YuqueClient,
      args: {
        repo_id: string | number;
        doc_id: string | number;
        format?: 'markdown' | 'lake' | 'html';
        include_lake: boolean;
      }
    ) => {
      const doc = await client.getDoc(args.repo_id, args.doc_id);

      // Sheet documents: format as Markdown table with graceful degradation
      if (isSheetDoc(doc)) {
        const { formatted, success } = formatSheet(doc);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ...formatDocSummary(doc),
                  body: success ? formatted : (doc.body_sheet ?? doc.body),
                  format_note: success
                    ? 'Formatted as Markdown table'
                    : 'Raw format (formatting failed)',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Regular documents
      const formattedDoc = shouldUseYmdForDoc(doc, args.format)
        ? withYmdBody(doc, await client.getYmdDoc(doc.id))
        : doc;
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              formatDoc(formattedDoc, { includeLake: args.include_lake }),
              null,
              2
            ),
          },
        ],
      };
    },
  },

  yuque_create_doc: {
    description:
      'Create a new document in a repo/book. Sheet (lakesheet) documents cannot be created via API.',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      title: z.string().describe('Document title'),
      slug: z.string().optional().describe('Document slug (URL-friendly identifier)'),
      body: z.string().optional().describe('Document content (markdown or lake format)'),
      format: z.string().optional().describe('Content format: markdown, lake, html'),
      public: z.number().optional().describe('Public visibility: 0 (private) or 1 (public)'),
    }),
    handler: async (
      client: YuqueClient,
      args: {
        repo_id: string | number;
        title: string;
        slug?: string;
        body?: string;
        format?: string;
        public?: number;
      }
    ) => {
      assertCreateFormatSupported(args.format);

      const data = {
        title: args.title,
        slug: args.slug,
        body: args.body,
        format: args.format,
        public: args.public,
      };
      const doc = await client.createDoc(args.repo_id, data);

      // Auto-append to TOC
      const tocWarning = await appendDocToToc(client, args.repo_id, doc.id);

      const result: { type: 'text'; text: string }[] = [
        { type: 'text' as const, text: JSON.stringify(formatDoc(doc), null, 2) },
      ];
      if (tocWarning) {
        result.push({ type: 'text' as const, text: tocWarning });
      }
      return { content: result };
    },
  },

  yuque_update_doc: {
    description:
      'Update an existing document. Sheet and other non-Doc types: metadata-only (title, slug, public); body updates are not supported by the Open API.',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      doc_id: z
        .union([z.string(), z.number()])
        .describe('Document ID or slug'),
      title: z.string().optional().describe('New document title'),
      slug: z.string().optional().describe('New document slug'),
      body: z.string().optional().describe('New document content'),
      format: z
        .enum(['markdown', 'lake', 'html'])
        .optional()
        .describe(
          'Content format for body. Omit or use markdown to write through the YMD-compatible flow; use lake/html for the legacy document API.'
        ),
      public: z.number().optional().describe('Public visibility: 0 (private) or 1 (public)'),
    }),
    handler: async (
      client: YuqueClient,
      args: {
        repo_id: string | number;
        doc_id: string | number;
        title?: string;
        slug?: string;
        body?: string;
        format?: 'markdown' | 'lake' | 'html';
        public?: number;
      }
    ) => {
      const metadata = {
        title: args.title,
        slug: args.slug,
        public: args.public,
      };
      const hasMetadataUpdate = Object.values(metadata).some((value) => value !== undefined);

      if (args.body !== undefined) {
        const currentDoc = await client.getDoc(args.repo_id, args.doc_id);
        assertDocBodyWritable(currentDoc);

        if (shouldUseYmdForDoc(currentDoc, args.format)) {
          const doc = hasMetadataUpdate
            ? await client.updateDoc(args.repo_id, args.doc_id, metadata)
            : currentDoc;
          await client.updateYmdDoc(currentDoc.id, args.body);
          const ymdDoc = await client.getYmdDoc(currentDoc.id);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(formatDoc(withYmdBody(doc, ymdDoc)), null, 2),
              },
            ],
          };
        }
      }

      const data = {
        ...metadata,
        body: args.body,
        format: args.format,
      };
      const doc = await client.updateDoc(args.repo_id, args.doc_id, data);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatDoc(doc), null, 2),
          },
        ],
      };
    },
  },

};
