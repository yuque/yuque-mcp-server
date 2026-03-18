import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';

export const searchTools = {
  yuque_search: {
    description: 'Search for documents or repos in Yuque',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      type: z.enum(['doc', 'repo']).describe('Search type: doc (documents), repo (knowledge bases)'),
    }),
    handler: async (client: YuqueClient, args: { query: string; type: 'doc' | 'repo' }) => {
      const result = await client.search(args.query, args.type);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result ?? [], null, 2),
          },
        ],
      };
    },
  },
};
