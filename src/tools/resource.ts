import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import type { YuqueBoardDsl, YuqueBoardType, YuqueResourceType } from '../services/types.js';

const resourceTypeSchema = z
  .enum(['board'])
  .describe('Resource type. Currently only board is supported.');

const docLocatorFields = {
  doc_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Yuque document ID. Provide either doc_id or url, but not both.'),
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .optional()
    .describe('Yuque document URL. Provide either url or doc_id, but not both.'),
};

const boardResourceIdSchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes('://'), {
    message: 'resource_id must be a raw board resource id',
  })
  .describe(
    'Raw board resource ID from board://<resource_id>; do not pass the full board:// locator.'
  );

const boardDslSchema = (z.record(z.unknown()) as z.ZodType<YuqueBoardDsl>).describe(
  'Board JSON DSL object. It is passed through to Yuque public v2 as-is.'
);

function validateDocLocator(value: { doc_id?: number; url?: string }, ctx: z.RefinementCtx) {
  const hasDocId = value.doc_id !== undefined;
  const hasUrl = value.url !== undefined;
  if (hasDocId === hasUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['doc_id'],
      message: 'Provide exactly one of doc_id or url',
    });
  }
}

function validateBoardUpdateBody(
  value: { text?: string; dsl?: YuqueBoardDsl },
  ctx: z.RefinementCtx
) {
  const hasText = value.text !== undefined;
  const hasDsl = value.dsl !== undefined;
  if (hasText === hasDsl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['text'],
      message: 'Provide exactly one of text or dsl',
    });
  }
}

const getResourceSchema = z
  .object({
    resource_type: resourceTypeSchema,
    ...docLocatorFields,
    resource_id: boardResourceIdSchema,
  })
  .superRefine(validateDocLocator);

const createResourceSchema = z
  .object({
    resource_type: resourceTypeSchema,
    ...docLocatorFields,
    type: z
      .enum(['mindmap', 'flowchart', 'architecturediagram'])
      .describe('Board type: mindmap, flowchart, or architecturediagram.'),
    dsl: z.string().min(1).describe('Board text DSL content.'),
    insert_after_lake_id: z
      .string()
      .min(1)
      .optional()
      .describe('Insert after a top-level Lake node. Omit to append to the document end.'),
  })
  .superRefine(validateDocLocator);

const updateResourceSchema = z
  .object({
    resource_type: resourceTypeSchema,
    ...docLocatorFields,
    resource_id: boardResourceIdSchema,
    text: z.string().optional().describe('New board text DSL. Mutually exclusive with dsl.'),
    dsl: boardDslSchema.optional(),
  })
  .superRefine((value, ctx) => {
    validateDocLocator(value, ctx);
    validateBoardUpdateBody(value, ctx);
  });

export const resourceTools = {
  yuque_get_resource: {
    description:
      'Read a structured resource view from a Yuque document. Currently resource_type only supports board; pass the raw resource_id, not board://<resource_id>.',
    inputSchema: getResourceSchema,
    handler: async (
      client: YuqueClient,
      args: {
        resource_type: YuqueResourceType;
        doc_id?: number;
        url?: string;
        resource_id: string;
      }
    ) => {
      const result = await client.getResource(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },

  yuque_create_resource: {
    description:
      'Create a structured resource in a Yuque document. Currently resource_type only supports board: mindmap, flowchart, or architecturediagram.',
    inputSchema: createResourceSchema,
    handler: async (
      client: YuqueClient,
      args: {
        resource_type: YuqueResourceType;
        doc_id?: number;
        url?: string;
        type: YuqueBoardType;
        dsl: string;
        insert_after_lake_id?: string;
      }
    ) => {
      const result = await client.createResource(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },

  yuque_update_resource: {
    description:
      'Update a structured resource in a Yuque document. Currently resource_type only supports board; provide exactly one of text or dsl.',
    inputSchema: updateResourceSchema,
    handler: async (
      client: YuqueClient,
      args: {
        resource_type: YuqueResourceType;
        doc_id?: number;
        url?: string;
        resource_id: string;
        text?: string;
        dsl?: YuqueBoardDsl;
      }
    ) => {
      const result = await client.updateResource(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },
};
