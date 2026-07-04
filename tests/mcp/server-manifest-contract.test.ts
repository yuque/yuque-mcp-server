import { describe, expect, it } from 'vitest';
import serverManifest from '../../server.json';

type ServerManifest = {
  packages: Array<{
    environmentVariables?: Array<{
      name: string;
      isRequired: boolean;
      isSecret: boolean;
    }>;
  }>;
};

describe('MCP server manifest contract', () => {
  it('should expose only the supported Yuque token and host variables', () => {
    const manifest = serverManifest as ServerManifest;
    const envVars = manifest.packages[0]?.environmentVariables ?? [];

    expect(envVars.map((envVar) => envVar.name)).toEqual(['YUQUE_TOKEN', 'YUQUE_HOST']);
    expect(envVars).toEqual([
      expect.objectContaining({
        name: 'YUQUE_TOKEN',
        isRequired: true,
        isSecret: true,
      }),
      expect.objectContaining({
        name: 'YUQUE_HOST',
        isRequired: false,
        isSecret: false,
      }),
    ]);
  });
});
