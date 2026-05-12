const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'googleAccessToken',
  'googleRefreshToken',
  'google_access_token',
  'google_refresh_token',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'jwtSecret',
]);

export function maskSensitive<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskSensitive) as unknown as T;
  if (typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(k)) {
      out[k] = '***';
    } else {
      out[k] = maskSensitive(v);
    }
  }
  return out as unknown as T;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
