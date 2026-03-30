import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import { formatRepo } from '../utils/format.js';

export const bookTools = {
  yuque_list_books: {
    description: 'List all books (知识库) for the current user',
    inputSchema: z.object({
      login: z.string().describe('User login name'),
    }),
    handler: async (client: YuqueClient, args: { login: string }) => {
      const repos = await client.listUserRepos(args.login);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(repos.map(formatRepo), null, 2),
          },
        ],
      };
    },
  },

  yuque_get_book: {
    description: 'Get a specific book (知识库) by ID or namespace',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Book ID or namespace (e.g., "user/book_slug")'),
    }),
    handler: async (client: YuqueClient, args: { repo_id: string | number }) => {
      const repo = await client.getRepo(args.repo_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatRepo(repo), null, 2),
          },
        ],
      };
    },
  },

  yuque_create_book: {
    description: 'Create a new book (知识库) for the current user',
    inputSchema: z.object({
      login: z.string().describe('User login name'),
      name: z.string().describe('Book name'),
      slug: z.string().describe('Book slug (URL-friendly identifier)'),
      description: z.string().optional().describe('Book description'),
      public: z.number().optional().describe('Public visibility: 0 (private) or 1 (public)'),
      repo_type: z.string().optional().describe('Book type: Book, Design, etc.'),
    }),
    handler: async (
      client: YuqueClient,
      args: {
        login: string;
        name: string;
        slug: string;
        description?: string;
        public?: number;
        repo_type?: string;
      }
    ) => {
      const data = {
        name: args.name,
        slug: args.slug,
        description: args.description,
        public: args.public,
        type: args.repo_type,
      };
      const repo = await client.createUserRepo(args.login, data);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatRepo(repo), null, 2),
          },
        ],
      };
    },
  },

  yuque_update_book: {
    description: 'Update a book (知识库)',
    inputSchema: z.object({
      repo_id: z
        .union([z.string(), z.number()])
        .describe('Book ID or namespace (e.g., "user/book_slug")'),
      name: z.string().optional().describe('New book name'),
      slug: z.string().optional().describe('New book slug'),
      description: z.string().optional().describe('New book description'),
      public: z.number().optional().describe('Public visibility: 0 (private) or 1 (public)'),
    }),
    handler: async (
      client: YuqueClient,
      args: {
        repo_id: string | number;
        name?: string;
        slug?: string;
        description?: string;
        public?: number;
      }
    ) => {
      const data = {
        name: args.name,
        slug: args.slug,
        description: args.description,
        public: args.public,
      };
      const repo = await client.updateRepo(args.repo_id, data);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatRepo(repo), null, 2),
          },
        ],
      };
    },
  },
};
