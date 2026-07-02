import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const cliMocks = vi.hoisted(() => ({
  handleCliSubcommands: vi.fn(),
  runStdioServer: vi.fn(),
}));

vi.mock('../src/cli-install.js', () => ({
  handleCliSubcommands: cliMocks.handleCliSubcommands,
}));

vi.mock('../src/server.js', () => ({
  runStdioServer: cliMocks.runStdioServer,
}));

const originalArgv = process.argv;
const originalToken = process.env.YUQUE_PERSONAL_TOKEN;
const originalBaseURL = process.env.YUQUE_BASE_URL;
const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
let cliImportRun = 0;

function setIsTTY(value: boolean) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

async function importCli() {
  const importers = [
    () => import('../src/cli.js?case=0'),
    () => import('../src/cli.js?case=1'),
    () => import('../src/cli.js?case=2'),
    () => import('../src/cli.js?case=3'),
    () => import('../src/cli.js?case=4'),
  ];
  const importer = importers[cliImportRun++];
  if (!importer) throw new Error('No CLI import slot left');
  return importer();
}

function mockExit(throws = true) {
  return vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    if (throws) {
      throw new Error(`exit:${code}`);
    }
    return undefined as never;
  });
}

describe('CLI entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cliMocks.handleCliSubcommands.mockReturnValue(false);
    cliMocks.runStdioServer.mockResolvedValue(undefined);
    process.argv = ['node', 'cli.js'];
    delete process.env.YUQUE_PERSONAL_TOKEN;
    delete process.env.YUQUE_BASE_URL;
    setIsTTY(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv;
    process.env.YUQUE_PERSONAL_TOKEN = originalToken;
    process.env.YUQUE_BASE_URL = originalBaseURL;
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    }
  });

  it('should stop when an install/setup subcommand is handled', async () => {
    cliMocks.handleCliSubcommands.mockReturnValue(true);
    process.argv = ['node', 'cli.js', 'install'];

    await importCli();

    expect(cliMocks.handleCliSubcommands).toHaveBeenCalledWith(process.argv);
    expect(cliMocks.runStdioServer).not.toHaveBeenCalled();
  });

  it('should exit when token is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    await expect(importCli()).rejects.toThrow('exit:1');

    expect(error).toHaveBeenCalledWith(
      'Error: YUQUE_PERSONAL_TOKEN environment variable or --token argument is required'
    );
  });

  it('should print terminal guidance when run directly in a TTY', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.YUQUE_PERSONAL_TOKEN = 'env-token';
    setIsTTY(true);
    mockExit();

    await expect(importCli()).rejects.toThrow('exit:0');

    expect(log.mock.calls[0]?.[0]).toContain('Yuque MCP Server');
    expect(cliMocks.runStdioServer).not.toHaveBeenCalled();
  });

  it('should start stdio server with token and base URL arguments', async () => {
    process.argv = [
      'node',
      'cli.js',
      '--token=arg-token',
      '--base-url=https://yuque.internal/api/v2',
    ];

    await importCli();

    expect(cliMocks.runStdioServer).toHaveBeenCalledWith(
      'arg-token',
      'https://yuque.internal/api/v2'
    );
  });

  it('should exit when stdio startup fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.YUQUE_PERSONAL_TOKEN = 'env-token';
    cliMocks.runStdioServer.mockRejectedValue(new Error('stdio failed'));
    mockExit(false);

    await importCli();
    await Promise.resolve();

    expect(error).toHaveBeenCalledWith('Fatal error:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
