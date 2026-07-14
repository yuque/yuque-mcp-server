import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import {
  formatDocSummary,
  formatDoc,
  formatYmdDoc,
  formatYmdDocWriteResult,
} from '../utils/format.js';

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

function shouldUseYmd(format?: string): boolean {
  return !format || format === 'markdown';
}

/** The YMD API only accepts numeric doc IDs, so slugs need one extra lookup. */
async function resolveDocId(
  client: YuqueClient,
  repoId: string | number,
  docId: string | number
): Promise<number> {
  if (typeof docId === 'number') return docId;
  const doc = await client.getDoc(repoId, docId);
  return doc.id;
}

export const docTools = {
  yuque_list_docs: {
    description: 'List documents in a repo/book with optional pagination',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Pagination offset (number of docs to skip)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of docs per page (default and max: 100)'),
    }),
    handler: async (
      client: YuqueClient,
      args: { repo_id: string | number; offset?: number; limit?: number }
    ) => {
      const docs = await client.listDocs(args.repo_id, {
        offset: args.offset,
        limit: args.limit,
      });
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
      'Get a specific document with full content. By default (format omitted or markdown) the body is read through the YMD markdown API; use format lake/html or include_lake to read through the legacy document API instead.',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      doc_id: z
        .union([z.string(), z.number()])
        .describe('Document ID or slug. A numeric ID saves one lookup call on the markdown path.'),
      format: z
        .enum(['markdown', 'lake', 'html'])
        .optional()
        .describe(
          'Content format to read. Omit or use markdown for the YMD markdown API; use lake/html for the legacy document API.'
        ),
      include_lake: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Include raw Lake format body (preserves Mermaid source code, diagrams, etc.). Forces the legacy document API path.'
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
      if (shouldUseYmd(args.format) && !args.include_lake) {
        const docId = await resolveDocId(client, args.repo_id, args.doc_id);
        const ymdDoc = await client.getYmdDoc(docId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatYmdDoc(ymdDoc), null, 2),
            },
          ],
        };
      }

      const doc = await client.getDoc(args.repo_id, args.doc_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatDoc(doc, { includeLake: args.include_lake }), null, 2),
          },
        ],
      };
    },
  },

  yuque_create_doc: {
    description: 'Create a new document in a repo/book',
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
      'Update an existing document. Exactly one Yuque write API is used per call: a markdown body (format omitted or markdown) goes through the YMD markdown API and cannot be combined with title/slug/public changes — update metadata in a separate call. Metadata-only updates and lake/html bodies go through the legacy document API.',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      doc_id: z
        .union([z.string(), z.number()])
        .describe('Document ID or slug. A numeric ID saves one lookup call on the markdown path.'),
      title: z.string().optional().describe('New document title'),
      slug: z.string().optional().describe('New document slug'),
      body: z.string().optional().describe('New document content'),
      format: z
        .enum(['markdown', 'lake', 'html'])
        .optional()
        .describe(
          'Content format for body. Omit or use markdown for the YMD markdown API; use lake/html for the legacy document API.'
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

      if (args.body !== undefined && shouldUseYmd(args.format)) {
        if (hasMetadataUpdate) {
          throw new Error(
            'A markdown body update goes through the YMD API and cannot change title/slug/public in the same call. ' +
              'Call yuque_update_doc twice: once with only metadata fields, once with only body.'
          );
        }
        const docId = await resolveDocId(client, args.repo_id, args.doc_id);
        const writeResult = await client.updateYmdDoc(docId, args.body);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatYmdDocWriteResult(writeResult), null, 2),
            },
          ],
        };
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
