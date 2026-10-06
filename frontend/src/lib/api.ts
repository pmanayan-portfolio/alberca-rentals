export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

function getCookie(name: string): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const prefix = `${name}=`;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(prefix));

  if (!cookie) {
    return '';
  }

  return decodeURIComponent(cookie.substring(prefix.length));
}

export async function csrf(): Promise<void> {
  const response = await fetch(
    `${API_ORIGIN}/sanctum/csrf-cookie`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to initialize secure session (${response.status})`,
    );
  }
}

export async function api<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();

  const isMutation = ![
    'GET',
    'HEAD',
    'OPTIONS',
  ].includes(method);

  const headers = new Headers(init.headers || {});

  headers.set('Accept', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (
    !(init.body instanceof FormData) &&
    init.body !== undefined &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (isMutation) {
    const xsrfToken = getCookie('XSRF-TOKEN');

    if (xsrfToken) {
      headers.set('X-XSRF-TOKEN', xsrfToken);
    }
  }

  const response = await fetch(
    `${API_ORIGIN}${path}`,
    {
      ...init,
      credentials: 'include',
      headers,
    },
  );

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => null);

    const validationErrors = body?.errors
      ? Object.values(body.errors)
          .flat()
          .join('\n')
      : '';

    throw new Error(
      body?.message ||
        validationErrors ||
        `Request failed (${response.status})`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function mutate<T = any>(
  path: string,
  init: RequestInit,
): Promise<T> {
  await csrf();

  return api<T>(path, init);
}