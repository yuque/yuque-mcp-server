export const MISSING_TOKEN_MESSAGE =
  'Error: YUQUE_TOKEN environment variable, YUQUE_PERSONAL_TOKEN environment variable, or --token argument is required';

function readArg(argv: string[], name: string): string | undefined {
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

export function normalizeYuqueBaseURL(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  const withoutTrailingSlash = raw.replace(/\/+$/, '');

  try {
    const url = new URL(withoutTrailingSlash);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname || pathname === '/') {
      url.pathname = '/api/v2';
      return url.toString().replace(/\/+$/, '');
    }
    return withoutTrailingSlash;
  } catch {
    return withoutTrailingSlash;
  }
}

export function resolveYuqueToken(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  return env.YUQUE_TOKEN || env.YUQUE_PERSONAL_TOKEN || readArg(argv, 'token');
}

export function resolveYuqueBaseURL(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const hostOrBaseURL =
    env.YUQUE_HOST || readArg(argv, 'host') || env.YUQUE_BASE_URL || readArg(argv, 'base-url');

  return normalizeYuqueBaseURL(hostOrBaseURL);
}
