interface OwnerRequest {
  header(name: string): string | undefined;
  url: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'app.test']);

export function requireOwner(request: OwnerRequest, env: Env) {
  const hostname = new URL(request.url).hostname;
  const email = request.header('cf-access-authenticated-user-email')?.trim();
  if (LOCAL_HOSTS.has(hostname) && !email) return { ok: true as const, email: 'local-development' };
  if (!email) return { ok: false as const, status: 401 as const, error: 'Owner authentication is required.' };
  if (!env.OWNER_EMAIL || email.toLowerCase() !== env.OWNER_EMAIL.trim().toLowerCase()) {
    return { ok: false as const, status: 403 as const, error: 'Owner authentication is required.' };
  }
  return { ok: true as const, email };
}
