import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const readlineMock = vi.hoisted(() => ({
  answers: [] as string[],
  close: vi.fn(),
}));

vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_question: string, callback: (answer: string) => void) => {
      callback(readlineMock.answers.shift() ?? '');
    }),
    close: readlineMock.close,
  })),
}));

let tmpDir: string;
let setupImportRun = 0;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yuque-mcp-setup-test-'));
  vi.clearAllMocks();
  readlineMock.answers = [];
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function mockExit(throws = true) {
  return vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    if (throws) {
      throw new Error(`exit:${code}`);
    }
    return undefined as never;
  });
}

async function importCliInstall() {
  vi.resetModules();
  const importers = [
    () => import('../src/cli-install.js?setup=0'),
    () => import('../src/cli-install.js?setup=1'),
    () => import('../src/cli-install.js?setup=2'),
    () => import('../src/cli-install.js?setup=3'),
    () => import('../src/cli-install.js?setup=4'),
  ];
  const importer = importers[setupImportRun++];
  if (!importer) throw new Error('No setup import slot left');
  return importer();
}

describe('runSetup', () => {
  it('should install using interactive answers', async () => {
    const module = await importCliInstall();
    const configPath = path.join(tmpDir, 'setup', 'claude_desktop_config.json');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const clientConfig = module.getClientConfig('claude-desktop');
    if (!clientConfig) throw new Error('claude-desktop config missing');
    clientConfig.getConfigPath = () => configPath;
    readlineMock.answers = ['setup-token', '1', 'https://yuque.internal/api/v2'];

    await module.runSetup();

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env).toEqual({
      YUQUE_PERSONAL_TOKEN: 'setup-token',
      YUQUE_BASE_URL: 'https://yuque.internal/api/v2',
    });
    expect(readlineMock.close).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Successfully configured'));
  });

  it('should exit when interactive token is empty', async () => {
    const module = await importCliInstall();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    readlineMock.answers = [''];
    mockExit();

    await expect(module.runSetup()).rejects.toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('\n❌ Token cannot be empty.\n');
    expect(readlineMock.close).toHaveBeenCalledTimes(1);
  });

  it('should exit when interactive client selection is invalid', async () => {
    const module = await importCliInstall();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    readlineMock.answers = ['setup-token', '999'];
    mockExit();

    await expect(module.runSetup()).rejects.toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('\n❌ Invalid selection.\n');
    expect(readlineMock.close).toHaveBeenCalledTimes(1);
  });
});

describe('handleCliSubcommands setup branch', () => {
  it('should handle setup subcommand', async () => {
    const module = await importCliInstall();
    const configPath = path.join(tmpDir, 'handle-setup', 'claude_desktop_config.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const clientConfig = module.getClientConfig('claude-desktop');
    if (!clientConfig) throw new Error('claude-desktop config missing');
    clientConfig.getConfigPath = () => configPath;
    readlineMock.answers = ['tok', '1', ''];

    const handled = module.handleCliSubcommands(['node', 'cli.js', 'setup']);
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }

    expect(handled).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should report setup failures from the async handler', async () => {
    const module = await importCliInstall();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const clientConfig = module.getClientConfig('claude-desktop');
    if (!clientConfig) throw new Error('claude-desktop config missing');
    clientConfig.getConfigPath = () => {
      throw new Error('config path failed');
    };
    readlineMock.answers = ['tok', '1', ''];
    mockExit(false);

    const handled = module.handleCliSubcommands(['node', 'cli.js', 'setup']);
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }

    expect(handled).toBe(true);
    expect(error).toHaveBeenCalledWith('Setup failed:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
