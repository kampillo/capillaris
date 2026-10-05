export interface AuditFieldDiff {
  key: string;
  before: unknown;
  after: unknown;
  beforeCaptured: boolean;
  afterCaptured: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function computeDiff(before: unknown, after: unknown, prefix = ''): AuditFieldDiff[] {
  if (!isRecord(before) || !isRecord(after)) return [];
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  return keys.flatMap(key => {
    const beforeCaptured = Object.prototype.hasOwnProperty.call(before, key);
    const afterCaptured = Object.prototype.hasOwnProperty.call(after, key);
    const b = beforeCaptured ? before[key] : undefined;
    const a = afterCaptured ? after[key] : undefined;
    const path = prefix ? `${prefix}.${key}` : key;
    if (beforeCaptured && afterCaptured && isRecord(b) && isRecord(a)) return computeDiff(b, a, path);
    if (beforeCaptured === afterCaptured && JSON.stringify(b) === JSON.stringify(a)) return [];
    return [{ key: path, before: b, after: a, beforeCaptured, afterCaptured }];
  });
}

export function renderAuditValue(value: unknown, captured = true): string {
  if (!captured || value === undefined) return 'No capturado';
  if (value === null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}
