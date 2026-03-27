import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import { formatDocSummary, formatDoc } from '../utils/format.js';

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
    description: 'Get a specific document with full content',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "mygroup/mybook")'),
      doc_id: z
        .union([z.string(), z.number()])
        .describe('Document ID or slug'),
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
        include_lake: boolean;
      }
    ) => {
      const doc = await client.getDoc(args.repo_id, args.doc_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              formatDoc(doc, { includeLake: args.include_lake }),
              null,
              2
            ),
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
    description: 'Update an existing document',
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
        public?: number;
      }
    ) => {
      const data = {
        title: args.title,
        slug: args.slug,
        body: args.body,
        public: args.public,
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
