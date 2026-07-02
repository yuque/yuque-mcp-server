import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  installToClient,
  getSupportedClients,
  getClientConfig,
  runInstall,
  handleCliSubcommands,
} from '../src/cli-install.js';

// Use a temp directory for all file operations
let tmpDir: string;
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalAppData = process.env.APPDATA;
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
const originalGetConfigPaths = new Map(
  getSupportedClients().map((client) => [client, getClientConfig(client)?.getConfigPath])
);

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yuque-mcp-test-'));
  vi.restoreAllMocks();
  restoreEnv('APPDATA', originalAppData);
  restoreEnv('XDG_CONFIG_HOME', originalXdgConfigHome);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  restoreEnv('APPDATA', originalAppData);
  restoreEnv('XDG_CONFIG_HOME', originalXdgConfigHome);
  for (const [client, getConfigPath] of originalGetConfigPaths) {
    const clientConfig = getClientConfig(client);
    if (clientConfig && getConfigPath) {
      clientConfig.getConfigPath = getConfigPath;
    }
  }
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform);
  }
});

/**
 * Helper: override the config path for a client by monkey-patching getConfigPath
 */
function mockConfigPath(client: string, configPath: string) {
  const clientConfig = getClientConfig(client as never);
  if (!clientConfig) throw new Error(`Unknown client: ${client}`);
  clientConfig.getConfigPath = () => configPath;
}

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

function mockExit() {
  return vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    throw new Error(`exit:${code}`);
  });
}

describe('getSupportedClients', () => {
  it('should return all 8 supported clients', () => {
    const clients = getSupportedClients();
    expect(clients).toContain('claude-desktop');
    expect(clients).toContain('vscode');
    expect(clients).toContain('cursor');
    expect(clients).toContain('windsurf');
    expect(clients).toContain('cline');
    expect(clients).toContain('trae');
    expect(clients).toContain('qoder');
    expect(clients).toContain('opencode');
    expect(clients.length).toBe(8);
  });
});

describe('getClientConfig', () => {
  it('should return config for valid client', () => {
    const config = getClientConfig('cursor');
    expect(config).toBeDefined();
    expect(config?.name).toBe('Cursor');
    expect(config?.configKey).toBe('mcpServers');
  });

  it('should return config with servers key for vscode', () => {
    const config = getClientConfig('vscode');
    expect(config).toBeDefined();
    expect(config?.name).toBe('VS Code');
    expect(config?.configKey).toBe('servers');
  });

  it('should return undefined for unknown client', () => {
    const config = getClientConfig('nonexistent' as never);
    expect(config).toBeUndefined();
  });

  it('should resolve platform-specific config paths', () => {
    const home = os.homedir();
    process.env.APPDATA = 'C:\\Users\\tester\\AppData\\Roaming';
    process.env.XDG_CONFIG_HOME = '/tmp/xdg-config';

    setPlatform('darwin');
    expect(getClientConfig('claude-desktop')?.getConfigPath()).toBe(
      path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    );
    expect(getClientConfig('cline')?.getConfigPath()).toContain(
      path.join('Library', 'Application Support', 'Code')
    );
    expect(getClientConfig('trae')?.getConfigPath()).toContain(
      path.join('Library', 'Application Support', 'Trae')
    );
    expect(getClientConfig('vscode')?.getConfigPath()).toBe(
      path.join(process.cwd(), '.vscode', 'mcp.json')
    );
    expect(getClientConfig('cursor')?.getConfigPath()).toBe(path.join(home, '.cursor', 'mcp.json'));
    expect(getClientConfig('windsurf')?.getConfigPath()).toBe(
      path.join(home, '.windsurf', 'mcp.json')
    );
    expect(getClientConfig('qoder')?.getConfigPath()).toBe(path.join(home, '.qoder', 'mcp.json'));
    expect(getClientConfig('opencode')?.getConfigPath()).toBe(
      path.join(process.cwd(), 'opencode.json')
    );

    setPlatform('win32');
    expect(getClientConfig('claude-desktop')?.getConfigPath()).toBe(
      path.join('C:\\Users\\tester\\AppData\\Roaming', 'Claude', 'claude_desktop_config.json')
    );
    expect(getClientConfig('cline')?.getConfigPath()).toContain(
      path.join('Code', 'User', 'globalStorage')
    );
    expect(getClientConfig('trae')?.getConfigPath()).toContain(
      path.join('Trae', 'User', 'globalStorage')
    );

    setPlatform('linux');
    expect(getClientConfig('claude-desktop')?.getConfigPath()).toBe(
      path.join('/tmp/xdg-config', 'Claude', 'claude_desktop_config.json')
    );
    expect(getClientConfig('cline')?.getConfigPath()).toContain(
      path.join('/tmp/xdg-config', 'Code', 'User', 'globalStorage')
    );
    expect(getClientConfig('trae')?.getConfigPath()).toContain(
      path.join('/tmp/xdg-config', 'Trae', 'User', 'globalStorage')
    );

    delete process.env.XDG_CONFIG_HOME;
    expect(getClientConfig('claude-desktop')?.getConfigPath()).toBe(
      path.join(home, '.config', 'Claude', 'claude_desktop_config.json')
    );

    setPlatform('freebsd');
    process.env.XDG_CONFIG_HOME = '/tmp/freebsd-xdg';
    expect(getClientConfig('claude-desktop')?.getConfigPath()).toBe(
      path.join(home, '.config', 'Claude', 'claude_desktop_config.json')
    );
  });
});

describe('installToClient', () => {
  it('should create a new config file for cursor (mcpServers format)', () => {
    const configPath = path.join(tmpDir, 'cursor', 'mcp.json');
    mockConfigPath('cursor', configPath);

    const result = installToClient({ token: 'test-token-123', client: 'cursor' });

    expect(result).toBe(configPath);
    expect(fs.existsSync(configPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content).toEqual({
      mcpServers: {
        yuque: {
          command: 'npx',
          args: ['-y', 'yuque-mcp'],
          env: {
            YUQUE_TOKEN: 'test-token-123',
          },
        },
      },
    });
  });

  it('should create a new config file for vscode (servers format)', () => {
    const configPath = path.join(tmpDir, '.vscode', 'mcp.json');
    mockConfigPath('vscode', configPath);

    const result = installToClient({ token: 'vsc-token', client: 'vscode' });

    expect(result).toBe(configPath);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content).toEqual({
      servers: {
        yuque: {
          command: 'npx',
          args: ['-y', 'yuque-mcp'],
          env: {
            YUQUE_TOKEN: 'vsc-token',
          },
        },
      },
    });
  });

  it('should merge with existing config (preserve other servers)', () => {
    const configPath = path.join(tmpDir, 'existing', 'mcp.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          mcpServers: {
            'other-server': {
              command: 'other',
              args: ['--flag'],
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    mockConfigPath('cursor', configPath);
    installToClient({ token: 'merge-token', client: 'cursor' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Original server should still be there
    expect(content.mcpServers['other-server']).toEqual({
      command: 'other',
      args: ['--flag'],
    });
    // New server should be added
    expect(content.mcpServers['yuque']).toEqual({
      command: 'npx',
      args: ['-y', 'yuque-mcp'],
      env: {
        YUQUE_TOKEN: 'merge-token',
      },
    });
  });

  it('should update existing yuque entry without duplicating', () => {
    const configPath = path.join(tmpDir, 'update', 'mcp.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          mcpServers: {
            yuque: {
              command: 'npx',
              args: ['-y', 'yuque-mcp'],
              env: {
                YUQUE_TOKEN: 'old-token',
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    mockConfigPath('cursor', configPath);
    installToClient({ token: 'new-token', client: 'cursor' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers['yuque'].env.YUQUE_TOKEN).toBe('new-token');
    // Should only have one entry
    expect(Object.keys(content.mcpServers)).toEqual(['yuque']);
  });

  it('should preserve other top-level keys in the config', () => {
    const configPath = path.join(tmpDir, 'preserve', 'mcp.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          someOtherSetting: true,
          mcpServers: {},
        },
        null,
        2
      ),
      'utf-8'
    );

    mockConfigPath('cursor', configPath);
    installToClient({ token: 'tok', client: 'cursor' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.someOtherSetting).toBe(true);
    expect(content.mcpServers.yuque).toBeDefined();
  });

  it('should include custom host in standard client env', () => {
    const configPath = path.join(tmpDir, 'host', 'mcp.json');
    mockConfigPath('cursor', configPath);

    installToClient({
      token: 'host-token',
      client: 'cursor',
      host: 'https://yuque.internal',
    });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env).toEqual({
      YUQUE_TOKEN: 'host-token',
      YUQUE_HOST: 'https://yuque.internal',
    });
  });

  it('should keep legacy baseURL callers working', () => {
    const configPath = path.join(tmpDir, 'base-url', 'mcp.json');
    mockConfigPath('cursor', configPath);

    installToClient({
      token: 'base-token',
      client: 'cursor',
      baseURL: 'https://yuque.internal/api/v2',
    });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env).toEqual({
      YUQUE_TOKEN: 'base-token',
      YUQUE_HOST: 'https://yuque.internal/api/v2',
    });
  });

  it('should create parent directories recursively', () => {
    const configPath = path.join(tmpDir, 'deep', 'nested', 'dir', 'mcp.json');
    mockConfigPath('cursor', configPath);

    installToClient({ token: 'deep-token', client: 'cursor' });

    expect(fs.existsSync(configPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env.YUQUE_TOKEN).toBe('deep-token');
  });

  it('should throw for unknown client', () => {
    expect(() => {
      installToClient({ token: 'tok', client: 'unknown-client' as never });
    }).toThrow('Unknown client');
  });

  it('should handle invalid JSON in existing file (backup and recreate)', () => {
    const configPath = path.join(tmpDir, 'invalid', 'mcp.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, '{ invalid json !!!', 'utf-8');

    mockConfigPath('cursor', configPath);
    installToClient({ token: 'fix-token', client: 'cursor' });

    // Backup should exist
    expect(fs.existsSync(configPath + '.backup')).toBe(true);
    // New valid config should exist
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env.YUQUE_TOKEN).toBe('fix-token');
  });

  it('should work for claude-desktop client', () => {
    const configPath = path.join(tmpDir, 'claude', 'claude_desktop_config.json');
    mockConfigPath('claude-desktop', configPath);

    installToClient({ token: 'claude-tok', client: 'claude-desktop' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque).toBeDefined();
    expect(content.mcpServers.yuque.command).toBe('npx');
  });

  it('should work for windsurf client', () => {
    const configPath = path.join(tmpDir, 'windsurf', 'mcp.json');
    mockConfigPath('windsurf', configPath);

    installToClient({ token: 'wind-tok', client: 'windsurf' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque).toBeDefined();
  });

  it('should work for cline client', () => {
    const configPath = path.join(tmpDir, 'cline', 'settings.json');
    mockConfigPath('cline', configPath);

    installToClient({ token: 'cline-tok', client: 'cline' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque).toBeDefined();
  });

  it('should work for trae client', () => {
    const configPath = path.join(tmpDir, 'trae', 'settings.json');
    mockConfigPath('trae', configPath);

    installToClient({ token: 'trae-tok', client: 'trae' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque).toBeDefined();
  });

  it('should work for qoder client', () => {
    const configPath = path.join(tmpDir, 'qoder', 'mcp.json');
    mockConfigPath('qoder', configPath);

    installToClient({ token: 'qoder-tok', client: 'qoder' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque).toBeDefined();
    expect(content.mcpServers.yuque.command).toBe('npx');
    expect(content.mcpServers.yuque.env.YUQUE_TOKEN).toBe('qoder-tok');
  });

  it('should work for opencode client with custom format', () => {
    const configPath = path.join(tmpDir, 'opencode', 'opencode.json');
    mockConfigPath('opencode', configPath);

    installToClient({ token: 'opencode-tok', client: 'opencode' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcp.yuque).toBeDefined();
    expect(content.mcp.yuque).toEqual({
      type: 'local',
      command: ['npx', '-y', 'yuque-mcp'],
      environment: {
        YUQUE_TOKEN: 'opencode-tok',
      },
      enabled: true,
    });
    // Should NOT have mcpServers key
    expect(content.mcpServers).toBeUndefined();
  });

  it('should include custom host in opencode environment', () => {
    const configPath = path.join(tmpDir, 'opencode-host', 'opencode.json');
    mockConfigPath('opencode', configPath);

    installToClient({
      token: 'opencode-host-token',
      client: 'opencode',
      host: 'https://yuque.internal',
    });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcp.yuque.environment).toEqual({
      YUQUE_TOKEN: 'opencode-host-token',
      YUQUE_HOST: 'https://yuque.internal',
    });
  });

  it('should merge opencode config with existing settings', () => {
    const configPath = path.join(tmpDir, 'opencode-merge', 'opencode.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          $schema: 'https://opencode.ai/config.json',
          model: 'anthropic/claude-sonnet-4-5',
          mcp: {
            'other-server': {
              type: 'local',
              command: ['npx', '-y', 'other-mcp'],
              enabled: true,
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    mockConfigPath('opencode', configPath);
    installToClient({ token: 'oc-merge-tok', client: 'opencode' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Existing settings preserved
    expect(content['$schema']).toBe('https://opencode.ai/config.json');
    expect(content.model).toBe('anthropic/claude-sonnet-4-5');
    // Existing MCP server preserved
    expect(content.mcp['other-server']).toBeDefined();
    // Yuque added
    expect(content.mcp.yuque).toEqual({
      type: 'local',
      command: ['npx', '-y', 'yuque-mcp'],
      environment: {
        YUQUE_TOKEN: 'oc-merge-tok',
      },
      enabled: true,
    });
  });

  it('should merge into vscode config with existing servers', () => {
    const configPath = path.join(tmpDir, 'vscode-merge', 'mcp.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          servers: {
            'github-copilot': {
              command: 'gh-copilot',
              args: ['serve'],
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    mockConfigPath('vscode', configPath);
    installToClient({ token: 'vsc-merge-tok', client: 'vscode' });

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Original server preserved
    expect(content.servers['github-copilot']).toBeDefined();
    // Yuque added under 'servers' (not 'mcpServers')
    expect(content.servers['yuque']).toBeDefined();
    expect(content.servers['yuque'].env.YUQUE_TOKEN).toBe('vsc-merge-tok');
    // No mcpServers key should exist
    expect(content.mcpServers).toBeUndefined();
  });
});

describe('runInstall', () => {
  it('should install from CLI arguments', () => {
    const configPath = path.join(tmpDir, 'run-install', 'mcp.json');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConfigPath('cursor', configPath);

    runInstall([
      '--token=token=with=equals',
      '--client=cursor',
      '--host=https://yuque.internal',
    ]);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env).toEqual({
      YUQUE_TOKEN: 'token=with=equals',
      YUQUE_HOST: 'https://yuque.internal',
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Successfully configured'));
  });

  it('should accept legacy --base-url in CLI arguments', () => {
    const configPath = path.join(tmpDir, 'run-install-base-url', 'mcp.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConfigPath('cursor', configPath);

    runInstall([
      '--token=token=with=equals',
      '--client=cursor',
      '--base-url=https://yuque.internal/api/v2',
    ]);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.mcpServers.yuque.env).toEqual({
      YUQUE_TOKEN: 'token=with=equals',
      YUQUE_HOST: 'https://yuque.internal/api/v2',
    });
  });

  it('should exit when token argument is missing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    expect(() => runInstall(['--client=cursor'])).toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('Error: --token=YOUR_TOKEN is required.');
  });

  it('should exit when client argument is missing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    expect(() => runInstall(['--token=tok'])).toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('Error: --client=CLIENT is required.');
  });

  it('should exit when token value is empty', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    expect(() => runInstall(['--token=', '--client=cursor'])).toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('Error: Token value cannot be empty.');
  });

  it('should print thrown Error messages', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit();

    expect(() => runInstall(['--token=tok', '--client=unknown-client'])).toThrow('exit:1');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unknown client'));
  });

  it('should print fallback message for non-Error failures', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const clientConfig = getClientConfig('cursor');
    if (!clientConfig) throw new Error('cursor config missing');
    clientConfig.getConfigPath = () => {
      throw 'non-error failure';
    };
    mockExit();

    expect(() => runInstall(['--token=tok', '--client=cursor'])).toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('\n❌ An unexpected error occurred.\n');
  });
});

describe('handleCliSubcommands', () => {
  it('should handle install subcommand', () => {
    const configPath = path.join(tmpDir, 'handle-install', 'mcp.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConfigPath('cursor', configPath);

    const handled = handleCliSubcommands([
      'node',
      'cli.js',
      'install',
      '--token=tok',
      '--client=cursor',
    ]);

    expect(handled).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should ignore unknown subcommands', () => {
    expect(handleCliSubcommands(['node', 'cli.js', 'unknown'])).toBe(false);
  });
});
