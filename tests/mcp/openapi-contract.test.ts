import { describe, expect, it } from 'vitest';
import yuqueOpenApi from '../../scripts/yuque-openapi.json';
import { createServer } from '../../src/server.js';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

type OpenApiParameter = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
};

type OpenApiOperation = {
  operationId: string;
  parameters?: OpenApiParameter[];
  requestBody?: unknown;
};

type OpenApiSpec = {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;
};

type OperationContract = {
  method: HttpMethod;
  path: string;
  operationId: string;
  requiredPathParams?: string[];
  requiredQueryParams?: string[];
  hasRequestBody?: boolean;
};

type ToolOpenApiContract = {
  tool: string;
  operations: OperationContract[];
};

type ListedTool = {
  name: string;
};

const spec = yuqueOpenApi as OpenApiSpec;

const openApiBackedToolContracts: ToolOpenApiContract[] = [
  {
    tool: 'yuque_get_user',
    operations: [{ method: 'get', path: '/api/v2/user', operationId: 'user_api_v2_user_info' }],
  },
  {
    tool: 'yuque_search',
    operations: [
      {
        method: 'get',
        path: '/api/v2/search',
        operationId: 'search_api_v2_search',
        requiredQueryParams: ['q', 'type'],
      },
    ],
  },
  {
    tool: 'yuque_list_books',
    operations: [
      {
        method: 'get',
        path: '/api/v2/users/{login}/repos',
        operationId: 'repo_api_v2_repo_list',
        requiredPathParams: ['login'],
      },
    ],
  },
  {
    tool: 'yuque_get_book',
    operations: [
      {
        method: 'get',
        path: '/api/v2/repos/{book_id}',
        operationId: 'repo_api_v2_repo_show-by_id',
        requiredPathParams: ['book_id'],
      },
      {
        method: 'get',
        path: '/api/v2/repos/{group_login}/{book_slug}',
        operationId: 'repo_api_v2_repo_show',
        requiredPathParams: ['group_login', 'book_slug'],
      },
    ],
  },
  {
    tool: 'yuque_create_book',
    operations: [
      {
        method: 'post',
        path: '/api/v2/users/{login}/repos',
        operationId: 'repo_api_v2_repo_create',
        requiredPathParams: ['login'],
        hasRequestBody: true,
      },
    ],
  },
  {
    tool: 'yuque_update_book',
    operations: [
      {
        method: 'put',
        path: '/api/v2/repos/{book_id}',
        operationId: 'repo_api_v2_repo_update-by_id',
        requiredPathParams: ['book_id'],
        hasRequestBody: true,
      },
      {
        method: 'put',
        path: '/api/v2/repos/{group_login}/{book_slug}',
        operationId: 'repo_api_v2_repo_update',
        requiredPathParams: ['group_login', 'book_slug'],
        hasRequestBody: true,
      },
    ],
  },
  {
    tool: 'yuque_list_docs',
    operations: [
      {
        method: 'get',
        path: '/api/v2/repos/{book_id}/docs',
        operationId: 'doc_api_v2_doc_list-by_id',
        requiredPathParams: ['book_id'],
      },
      {
        method: 'get',
        path: '/api/v2/repos/{group_login}/{book_slug}/docs',
        operationId: 'doc_api_v2_doc_list',
        requiredPathParams: ['group_login', 'book_slug'],
      },
    ],
  },
  {
    tool: 'yuque_get_doc',
    operations: [
      {
        method: 'get',
        path: '/api/v2/repos/{book_id}/docs/{id}',
        operationId: 'doc_api_v2_doc_show-by_book_and_id',
        requiredPathParams: ['book_id', 'id'],
      },
      {
        method: 'get',
        path: '/api/v2/repos/{group_login}/{book_slug}/docs/{id}',
        operationId: 'doc_api_v2_doc_show',
        requiredPathParams: ['group_login', 'book_slug', 'id'],
      },
    ],
  },
  {
    tool: 'yuque_create_doc',
    operations: [
      {
        method: 'post',
        path: '/api/v2/repos/{book_id}/docs',
        operationId: 'doc_api_v2_doc_create-by_id',
        requiredPathParams: ['book_id'],
        hasRequestBody: true,
      },
      {
        method: 'post',
        path: '/api/v2/repos/{group_login}/{book_slug}/docs',
        operationId: 'doc_api_v2_doc_create',
        requiredPathParams: ['group_login', 'book_slug'],
        hasRequestBody: true,
      },
    ],
  },
  {
    tool: 'yuque_update_doc',
    operations: [
      {
        method: 'put',
        path: '/api/v2/repos/{book_id}/docs/{id}',
        operationId: 'doc_api_v2_doc_update-by_id',
        requiredPathParams: ['book_id', 'id'],
        hasRequestBody: true,
      },
      {
        method: 'put',
        path: '/api/v2/repos/{group_login}/{book_slug}/docs/{id}',
        operationId: 'doc_api_v2_doc_update',
        requiredPathParams: ['group_login', 'book_slug', 'id'],
        hasRequestBody: true,
      },
    ],
  },
  {
    tool: 'yuque_get_toc',
    operations: [
      {
        method: 'get',
        path: '/api/v2/repos/{book_id}/toc',
        operationId: 'doc_api_v2_repo_toc_show-by_id',
        requiredPathParams: ['book_id'],
      },
      {
        method: 'get',
        path: '/api/v2/repos/{group_login}/{book_slug}/toc',
        operationId: 'doc_api_v2_repo_toc_show',
        requiredPathParams: ['group_login', 'book_slug'],
      },
    ],
  },
  {
    tool: 'yuque_update_toc',
    operations: [
      {
        method: 'put',
        path: '/api/v2/repos/{book_id}/toc',
        operationId: 'doc_api_v2_repo_toc_update-by_id',
        requiredPathParams: ['book_id'],
        hasRequestBody: true,
      },
      {
        method: 'put',
        path: '/api/v2/repos/{group_login}/{book_slug}/toc',
        operationId: 'doc_api_v2_repo_toc_update',
        requiredPathParams: ['group_login', 'book_slug'],
        hasRequestBody: true,
      },
    ],
  },
];

const extensionToolNames = [
  'yuque_list_notes',
  'yuque_get_note',
  'yuque_create_note',
  'yuque_update_note',
  'yuque_get_resource',
  'yuque_create_resource',
  'yuque_update_resource',
];

function getListToolsHandler(server: unknown) {
  return (
    server as {
      _requestHandlers: Map<
        string,
        (request: unknown, extra: unknown) => Promise<{ tools: ListedTool[] }>
      >;
    }
  )._requestHandlers.get('tools/list');
}

function getOperation(contract: OperationContract) {
  return spec.paths[contract.path]?.[contract.method];
}

function requiredParamNames(operation: OpenApiOperation, location: OpenApiParameter['in']) {
  return (operation.parameters ?? [])
    .filter((parameter) => parameter.in === location && parameter.required)
    .map((parameter) => parameter.name)
    .sort();
}

describe('OpenAPI-backed tool contract', () => {
  it('should pin the Yuque public OpenAPI source used by the MCP contract', () => {
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info).toMatchObject({
      title: '语雀 OpenAPI',
      version: '2.0.1',
    });
  });

  it('should map every OpenAPI-backed MCP tool to existing OpenAPI operations', () => {
    for (const toolContract of openApiBackedToolContracts) {
      for (const operationContract of toolContract.operations) {
        const operation = getOperation(operationContract);

        expect(
          operation,
          `${toolContract.tool} ${operationContract.method} ${operationContract.path}`
        ).toBeDefined();
        expect(operation?.operationId).toBe(operationContract.operationId);
        expect(requiredParamNames(operation as OpenApiOperation, 'path')).toEqual(
          (operationContract.requiredPathParams ?? []).sort()
        );
        expect(requiredParamNames(operation as OpenApiOperation, 'query')).toEqual(
          (operationContract.requiredQueryParams ?? []).sort()
        );
        if (operationContract.hasRequestBody) {
          expect(operation?.requestBody).toBeDefined();
        }
      }
    }
  });

  it('should classify every registered tool as OpenAPI-backed or an explicit extension', async () => {
    const server = createServer('test-token');
    const handler = getListToolsHandler(server);
    if (!handler) throw new Error('tools/list handler missing');
    const result = await handler({ method: 'tools/list', params: {} }, {});
    const classifiedToolNames = [
      ...openApiBackedToolContracts.map((contract) => contract.tool),
      ...extensionToolNames,
    ].sort();

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(classifiedToolNames);
  });
});
