import { describe, expect, it } from 'vitest';
import { normalizeYuqueBaseURL, resolveYuqueBaseURL, resolveYuqueToken } from '../../src/config.js';

describe('Yuque runtime config', () => {
  it('should resolve token with canonical env first and legacy env as fallback', () => {
    expect(
      resolveYuqueToken(['node', 'cli.js', '--token=arg-token'], {
        YUQUE_TOKEN: 'canonical-token',
        YUQUE_PERSONAL_TOKEN: 'legacy-token',
      })
    ).toBe('canonical-token');

    expect(
      resolveYuqueToken(['node', 'cli.js', '--token=arg-token'], {
        YUQUE_PERSONAL_TOKEN: 'legacy-token',
      })
    ).toBe('legacy-token');

    expect(resolveYuqueToken(['node', 'cli.js', '--token=arg=token'], {})).toBe('arg=token');
  });

  it('should normalize host values into Yuque API base URLs', () => {
    expect(normalizeYuqueBaseURL(undefined)).toBeUndefined();
    expect(normalizeYuqueBaseURL('https://space.yuque.com')).toBe(
      'https://space.yuque.com/api/v2'
    );
    expect(normalizeYuqueBaseURL('https://space.yuque.com/')).toBe(
      'https://space.yuque.com/api/v2'
    );
    expect(normalizeYuqueBaseURL('https://space.yuque.com/api/v2')).toBe(
      'https://space.yuque.com/api/v2'
    );
  });

  it('should resolve host with canonical env and flag before legacy base URL', () => {
    expect(
      resolveYuqueBaseURL(['node', 'cli.js', '--host=https://arg.yuque.com'], {
        YUQUE_HOST: 'https://env.yuque.com',
        YUQUE_BASE_URL: 'https://legacy.example/api/v2',
      })
    ).toBe('https://env.yuque.com/api/v2');

    expect(resolveYuqueBaseURL(['node', 'cli.js', '--host=https://arg.yuque.com'], {})).toBe(
      'https://arg.yuque.com/api/v2'
    );

    expect(
      resolveYuqueBaseURL(['node', 'cli.js', '--base-url=https://legacy.example/api/v2'], {})
    ).toBe('https://legacy.example/api/v2');
  });
});
