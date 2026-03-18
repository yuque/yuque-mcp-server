export class YuqueError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'YuqueError';
  }
}

/** Map common HTTP status codes to human-readable hints for better AI diagnostics. */
function statusHint(status: number): string {
  switch (status) {
    case 400: return 'Bad request — check the parameters';
    case 401: return 'Unauthorized — the API token (YUQUE_PERSONAL_TOKEN) may be invalid or expired';
    case 403: return 'Forbidden — insufficient permissions for this resource';
    case 404: return 'Not found — the resource does not exist or is not accessible';
    case 429: return 'Rate limited — too many requests, try again later';
    default:  return status >= 500 ? 'Yuque server error — try again later' : '';
  }
}

export function handleYuqueError(error: unknown): never {
  if (error instanceof YuqueError) {
    throw error;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };

    if (err.response) {
      const status = err.response.status;
      const apiMessage = err.response.data?.message || err.message || 'Unknown Yuque API error';
      const hint = status ? statusHint(status) : '';
      const message = hint ? `${apiMessage} (${hint})` : apiMessage;
      throw new YuqueError(message, status, error);
    }

    if (err.message) {
      throw new YuqueError(err.message, undefined, error);
    }
  }

  throw new YuqueError('Unknown error occurred', undefined, error);
}
