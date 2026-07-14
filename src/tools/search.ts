import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import { formatSearchResult } from '../utils/format.js';

export const searchTools = {
  yuque_search: {
    description: 'Search for documents or repos in Yuque',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      type: z
        .enum(['doc', 'repo'])
        .describe('Search type: doc (documents), repo (knowledge bases)'),
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
    }),
    handler: async (
      client: YuqueClient,
      args: { query: string; type: 'doc' | 'repo'; page?: number }
    ) => {
      const result = await client.search(args.query, args.type, args.page);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatSearchResult(result), null, 2),
          },
        ],
      };
    },
  },
};
