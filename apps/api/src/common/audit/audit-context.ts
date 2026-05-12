import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
}

const EMPTY: AuditContext = {
  userId: null,
  userEmail: null,
  ip: null,
  userAgent: null,
};

export const auditAls = new AsyncLocalStorage<AuditContext>();

export function getAuditContext(): AuditContext {
  return auditAls.getStore() ?? EMPTY;
}
