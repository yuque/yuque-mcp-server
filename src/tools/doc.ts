import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import type { YuqueDoc, YuqueYmdDoc } from '../services/types.js';
import {
  formatDocSummary,
  formatDoc,
  formatYmdDoc,
  formatYmdDocWriteResult,
  formatDocVersion,
  formatDocVersionDetail,
} from '../utils/format.js';
import {
  isNonMarkdownDoc,
  assertBodyWritable,
  assertCreateFormatSupported,
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

function shouldUseYmd(format?: string): boolean {
  return !format || format === 'markdown';
}

/** The YMD API only accepts numeric doc IDs, so slugs need one extra lookup. */
async function resolveDoc(
  client: YuqueClient,
  repoId: string | number,
  docId: string | number
): Promise<{ id: number; doc?: YuqueDoc }> {
  if (typeof docId === 'number') return { id: docId };
  const doc = await client.getDoc(repoId, docId);
  return { id: doc.id, doc };
}

function toTextResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
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
      'Get a specific document with full content. By default (format omitted or markdown) the body is read through the YMD markdown API; use format lake/html or include_lake to read through the legacy document API instead. 表格 (Sheet) documents are returned as a Markdown table and 数据表 (Table) documents expose body_table, both read through the legacy document API.',
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
        const { id: docId, doc: resolvedDoc } = await resolveDoc(client, args.repo_id, args.doc_id);

        // Sheet / Table / Board / Thread documents have no markdown body: /yfm/docs
        // either fails or returns an empty document for them.
        let ymdDoc: YuqueYmdDoc | undefined;
        let ymdError: unknown;
        try {
          ymdDoc = await client.getYmdDoc(docId);
        } catch (error) {
          ymdError = error;
        }

        if (ymdDoc?.yfm?.trim()) {
          return toTextResult(formatYmdDoc(ymdDoc));
        }

        // Either the YMD read failed or it returned nothing: fall back to the legacy
        // document API so the sheet / table body stays visible.
        let doc = resolvedDoc;
        if (!doc) {
          try {
            doc = await client.getDoc(args.repo_id, docId);
          } catch (fallbackError) {
            throw ymdError ?? fallbackError;
          }
        }

        if (!isNonMarkdownDoc(doc)) {
          if (ymdDoc) return toTextResult(formatYmdDoc(ymdDoc));
          throw ymdError;
        }

        return toTextResult(formatDoc(doc, { includeLake: args.include_lake }));
      }

      const doc = await client.getDoc(args.repo_id, args.doc_id);
      return toTextResult(formatDoc(doc, { includeLake: args.include_lake }));
    },
  },

  yuque_create_doc: {
    description:
      'Create a new document in a repo/book. Sheet (lakesheet) and Table (laketable) documents cannot be created through the Open API.',
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
      'Update an existing document. Exactly one Yuque write API is used per call: a markdown body (format omitted or markdown) goes through the YMD markdown API and cannot be combined with title/slug/public changes — update metadata in a separate call. Metadata-only updates and lake/html bodies go through the legacy document API. Sheet/Table/Board/Thread documents only accept metadata updates (title, slug, public); their body cannot be written through the Open API.',
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
        const { id: docId, doc: resolvedDoc } = await resolveDoc(client, args.repo_id, args.doc_id);
        // A slug lookup already returned the document, so guard sheet/table bodies for free.
        if (resolvedDoc) assertBodyWritable(resolvedDoc);
        const writeResult = await client.updateYmdDoc(docId, args.body);
        return toTextResult(formatYmdDocWriteResult(writeResult));
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

  yuque_list_doc_versions: {
    description:
      'List the published version history of a document (up to 100 versions, newest first): version id, title, slug and publish time. Use yuque_get_doc_version to read a version body or diff.',
    inputSchema: z.object({
      doc_id: z
        .number()
        .int()
        .positive()
        .describe('Document ID (numeric). Resolve a slug with yuque_get_doc first.'),
    }),
    handler: async (client: YuqueClient, args: { doc_id: number }) => {
      const versions = await client.listDocVersions(args.doc_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(versions.map(formatDocVersion), null, 2),
          },
        ],
      };
    },
  },

  yuque_get_doc_version: {
    description:
      'Read one document version: markdown body (body_md, falling back to the raw body) plus the diff against the previous version.',
    inputSchema: z.object({
      version_id: z.number().int().positive().describe('Version ID from yuque_list_doc_versions'),
    }),
    handler: async (client: YuqueClient, args: { version_id: number }) => {
      const version = await client.getDocVersion(args.version_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatDocVersionDetail(version), null, 2),
          },
        ],
      };
    },
  },
};
