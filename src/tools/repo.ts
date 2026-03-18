import { z } from 'zod';
import type { YuqueClient } from '../services/yuque-client.js';
import { formatRepo } from '../utils/format.js';

export const repoTools = {
  yuque_list_repos: {
    description: 'List all repos/books for a user',
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

  yuque_get_repo: {
    description: 'Get a specific repo/book by ID or namespace (user_login/book_slug)',
    inputSchema: z.object({
      id_or_namespace: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "myuser/mybook")'),
    }),
    handler: async (client: YuqueClient, args: { id_or_namespace: string | number }) => {
      const repo = await client.getRepo(args.id_or_namespace);
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

  yuque_create_repo: {
    description: 'Create a new repo/book for a user',
    inputSchema: z.object({
      login: z.string().describe('User login name'),
      name: z.string().describe('Repo name'),
      slug: z.string().describe('Repo slug (URL-friendly identifier)'),
      description: z.string().optional().describe('Repo description'),
      public: z.number().optional().describe('Public visibility: 0 (private) or 1 (public)'),
      repo_type: z.string().optional().describe('Repo type: Book, Design, etc.'),
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

  yuque_update_repo: {
    description: 'Update a repo/book',
    inputSchema: z.object({
      id_or_namespace: z
        .union([z.string(), z.number()])
        .describe('Repo ID or namespace (e.g., "myuser/mybook")'),
      name: z.string().optional().describe('New repo name'),
      slug: z.string().optional().describe('New repo slug'),
      description: z.string().optional().describe('New repo description'),
      public: z.number().optional().describe('Public visibility: 0 (private) or 1 (public)'),
    }),
    handler: async (
      client: YuqueClient,
      args: {
        id_or_namespace: string | number;
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
      const repo = await client.updateRepo(args.id_or_namespace, data);
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
