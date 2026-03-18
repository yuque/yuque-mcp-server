import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import { formatUser } from '../utils/format.js';

export const userTools = {
  yuque_get_user: {
    description: 'Get current authenticated user information',
    inputSchema: z.object({}),
    handler: async (client: YuqueClient, _args: Record<string, never>) => {
      const user = await client.getUser();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatUser(user), null, 2),
          },
        ],
      };
    },
  },
};
