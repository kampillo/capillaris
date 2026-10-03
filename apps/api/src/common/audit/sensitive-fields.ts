import { Prisma } from '@prisma/client';

const SENSITIVE_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'digest',
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

type AuditJsonValue = Prisma.InputJsonValue | null | undefined;

export function maskSensitive(value: unknown): AuditJsonValue {
  return toAuditJson(value, new WeakSet<object>());
}

function toAuditJson(value: unknown, ancestors: WeakSet<object>): AuditJsonValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return undefined;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  // Preserve exact decimal precision. Enumerating Decimal exposes its
  // constructor function, which Prisma rejects as an audit JSON value.
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (ancestors.has(value)) return '[Circular]';
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return Array.from(value, item => toAuditJson(item, ancestors) ?? null);
    }
    const entries = Object.entries(value).flatMap(([key, item]) => {
      const masked = SENSITIVE_FIELDS.has(key)
        ? '***'
        : toAuditJson(item, ancestors);
      return masked === undefined ? [] : [[key, masked]];
    });
    // fromEntries also preserves a literal __proto__ key without changing
    // the output object's prototype.
    return Object.fromEntries(entries);
  } finally {
    ancestors.delete(value);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
