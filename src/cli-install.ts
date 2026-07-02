import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as readline from 'node:readline';

// ─── Client Definitions ───────────────────────────────────────────────

type ClientId =
  | 'claude-desktop'
  | 'vscode'
  | 'cursor'
  | 'windsurf'
  | 'cline'
  | 'trae'
  | 'qoder'
  | 'opencode';

interface ClientConfig {
  name: string;
  configKey: 'mcpServers' | 'servers' | 'mcp';
  getConfigPath: () => string;
  /** Custom function to build the server entry for this client (if different from the default). */
  buildEntry?: (token: string, baseURL?: string) => Record<string, unknown>;
}

function getAppDataPath(): string {
  return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

function getConfigHome(): string {
  if (process.platform === 'linux') {
    return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }
  return '';
}

const CLIENT_CONFIGS: Record<ClientId, ClientConfig> = {
  'claude-desktop': {
    name: 'Claude Desktop',
    configKey: 'mcpServers',
    getConfigPath() {
      switch (process.platform) {
        case 'darwin':
          return path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Claude',
            'claude_desktop_config.json'
          );
        case 'win32':
          return path.join(getAppDataPath(), 'Claude', 'claude_desktop_config.json');
        default:
          return path.join(
            getConfigHome() || path.join(os.homedir(), '.config'),
            'Claude',
            'claude_desktop_config.json'
          );
      }
    },
  },
  vscode: {
    name: 'VS Code',
    configKey: 'servers',
    getConfigPath() {
      return path.join(process.cwd(), '.vscode', 'mcp.json');
    },
  },
  cursor: {
    name: 'Cursor',
    configKey: 'mcpServers',
    getConfigPath() {
      return path.join(os.homedir(), '.cursor', 'mcp.json');
    },
  },
  windsurf: {
    name: 'Windsurf',
    configKey: 'mcpServers',
    getConfigPath() {
      return path.join(os.homedir(), '.windsurf', 'mcp.json');
    },
  },
  cline: {
    name: 'Cline',
    configKey: 'mcpServers',
    getConfigPath() {
      switch (process.platform) {
        case 'darwin':
          return path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Code',
            'User',
            'globalStorage',
            'saoudrizwan.claude-dev',
            'settings',
            'cline_mcp_settings.json'
          );
        case 'win32':
          return path.join(
            getAppDataPath(),
            'Code',
            'User',
            'globalStorage',
            'saoudrizwan.claude-dev',
            'settings',
            'cline_mcp_settings.json'
          );
        default:
          return path.join(
            getConfigHome() || path.join(os.homedir(), '.config'),
            'Code',
            'User',
            'globalStorage',
            'saoudrizwan.claude-dev',
            'settings',
            'cline_mcp_settings.json'
          );
      }
    },
  },
  trae: {
    name: 'Trae',
    configKey: 'mcpServers',
    getConfigPath() {
      switch (process.platform) {
        case 'darwin':
          return path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Trae',
            'User',
            'globalStorage',
            'trae-ai.trae-core',
            'settings',
            'cline_mcp_settings.json'
          );
        case 'win32':
          return path.join(
            getAppDataPath(),
            'Trae',
            'User',
            'globalStorage',
            'trae-ai.trae-core',
            'settings',
            'cline_mcp_settings.json'
          );
        default:
          return path.join(
            getConfigHome() || path.join(os.homedir(), '.config'),
            'Trae',
            'User',
            'globalStorage',
            'trae-ai.trae-core',
            'settings',
            'cline_mcp_settings.json'
          );
      }
    },
  },
  qoder: {
    name: 'Qoder',
    configKey: 'mcpServers',
    getConfigPath() {
      return path.join(os.homedir(), '.qoder', 'mcp.json');
    },
  },
  opencode: {
    name: 'OpenCode',
    configKey: 'mcp',
    getConfigPath() {
      return path.join(process.cwd(), 'opencode.json');
    },
    buildEntry(token: string, baseURL?: string) {
      const env: Record<string, string> = { YUQUE_PERSONAL_TOKEN: token };
      if (baseURL) env.YUQUE_BASE_URL = baseURL;
      return {
        type: 'local',
        command: ['npx', '-y', 'yuque-mcp'],
        environment: env,
        enabled: true,
      };
    },
  },
};

// ─── Config Generation ────────────────────────────────────────────────

function buildServerEntry(token: string, baseURL?: string) {
  const env: Record<string, string> = { YUQUE_PERSONAL_TOKEN: token };
  if (baseURL) env.YUQUE_BASE_URL = baseURL;
  return {
    command: 'npx',
    args: ['-y', 'yuque-mcp'],
    env,
  };
}

// ─── Install Logic ────────────────────────────────────────────────────

export interface InstallOptions {
  token: string;
  client: ClientId;
  baseURL?: string;
}

export function getSupportedClients(): ClientId[] {
  return Object.keys(CLIENT_CONFIGS) as ClientId[];
}

export function getClientConfig(client: ClientId): ClientConfig | undefined {
  return CLIENT_CONFIGS[client];
}

/**
 * Install yuque-mcp config into the specified client's config file.
 * Returns the path that was written to.
 */
export function installToClient(options: InstallOptions): string {
  const clientConfig = CLIENT_CONFIGS[options.client];
  if (!clientConfig) {
    throw new Error(
      `Unknown client: "${options.client}". Supported clients: ${getSupportedClients().join(', ')}`
    );
  }

  const configPath = clientConfig.getConfigPath();
  const configKey = clientConfig.configKey;

  // Read existing config or start fresh
  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // If the file exists but is invalid JSON, back it up and start fresh
      const backupPath = configPath + '.backup';
      fs.copyFileSync(configPath, backupPath);
      console.log(`⚠️  Existing config was invalid JSON. Backed up to: ${backupPath}`);
      config = {};
    }
  }

  // Ensure the servers/mcpServers key exists
  if (!config[configKey] || typeof config[configKey] !== 'object') {
    config[configKey] = {};
  }

  // Inject/update the yuque entry
  const serversObj = config[configKey] as Record<string, unknown>;
  serversObj['yuque'] = clientConfig.buildEntry
    ? clientConfig.buildEntry(options.token, options.baseURL)
    : buildServerEntry(options.token, options.baseURL);

  // Create parent directories if needed
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });

  // Write the config file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return configPath;
}

// ─── CLI: install subcommand ──────────────────────────────────────────

export function runInstall(args: string[]): void {
  const tokenArg = args.find((a) => a.startsWith('--token='));
  const clientArg = args.find((a) => a.startsWith('--client='));
  const baseURLArg = args.find((a) => a.startsWith('--base-url='));

  if (!tokenArg) {
    console.error('Error: --token=YOUR_TOKEN is required.');
    console.error(
      'Usage: npx yuque-mcp install --token=YOUR_TOKEN --client=CLIENT [--base-url=URL]'
    );
    console.error(`Supported clients: ${getSupportedClients().join(', ')}`);
    process.exit(1);
  }

  if (!clientArg) {
    console.error('Error: --client=CLIENT is required.');
    console.error(
      'Usage: npx yuque-mcp install --token=YOUR_TOKEN --client=CLIENT [--base-url=URL]'
    );
    console.error(`Supported clients: ${getSupportedClients().join(', ')}`);
    process.exit(1);
  }

  const token = tokenArg.split('=').slice(1).join('=');
  const client = clientArg.split('=').slice(1).join('=') as ClientId;
  const baseURL = baseURLArg?.split('=').slice(1).join('=');

  if (!token) {
    console.error('Error: Token value cannot be empty.');
    process.exit(1);
  }

  try {
    const configPath = installToClient({ token, client, baseURL });
    const clientName = CLIENT_CONFIGS[client]?.name ?? client;
    console.log(`\n✅ Successfully configured yuque-mcp for ${clientName}!`);
    console.log(`   Config file: ${configPath}`);
    console.log(`\n   Restart ${clientName} to activate the MCP server.\n`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}\n`);
    } else {
      console.error('\n❌ An unexpected error occurred.\n');
    }
    process.exit(1);
  }
}

// ─── CLI: setup subcommand (interactive) ──────────────────────────────

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

export async function runSetup(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('\n🚀 Yuque MCP Server — Quick Setup\n');

    // Step 1: Ask for token
    console.log('Step 1: Enter your Yuque API token');
    console.log('   (Get one at https://www.yuque.com/settings/tokens)\n');
    const token = await askQuestion(rl, '   Token: ');
    if (!token) {
      console.error('\n❌ Token cannot be empty.\n');
      process.exit(1);
    }

    // Step 2: Select client
    const clients = getSupportedClients();
    console.log('\nStep 2: Select your MCP client\n');
    clients.forEach((id, i) => {
      const config = CLIENT_CONFIGS[id];
      console.log(`   ${i + 1}) ${config.name} (${id})`);
    });
    console.log('');

    const choice = await askQuestion(rl, '   Enter number (1-' + clients.length + '): ');
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= clients.length) {
      console.error('\n❌ Invalid selection.\n');
      process.exit(1);
    }

    const client = clients[idx];

    // Step 3: Ask for base URL (optional, for private deployments)
    console.log('\nStep 3: Enter your Yuque API base URL (optional)');
    console.log('   (Leave empty for https://www.yuque.com/api/v2)\n');
    const baseURL = (await askQuestion(rl, '   Base URL: ')) || undefined;

    // Step 4: Install
    console.log('');
    const configPath = installToClient({ token, client, baseURL });
    const clientName = CLIENT_CONFIGS[client].name;
    console.log(`✅ Successfully configured yuque-mcp for ${clientName}!`);
    console.log(`   Config file: ${configPath}`);
    console.log(`\n   Restart ${clientName} to activate the MCP server.\n`);
  } finally {
    rl.close();
  }
}

// ─── Entry: detect subcommands ────────────────────────────────────────

/**
 * Check if the CLI was invoked with install or setup subcommand.
 * Returns true if handled (caller should exit), false otherwise.
 */
export function handleCliSubcommands(argv: string[]): boolean {
  const subcommand = argv[2]; // argv[0] = node, argv[1] = script

  if (subcommand === 'install') {
    runInstall(argv.slice(3));
    return true;
  }

  if (subcommand === 'setup') {
    runSetup().catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
    return true;
  }

  return false;
}
