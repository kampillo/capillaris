import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getAuditContext } from './audit-context';
import { isUuid } from './sensitive-fields';

export interface AuditWriteOptions {
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  // Optional overrides — used by login/logout where no JWT context is in ALS yet.
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditWriterService {
  private readonly logger = new Logger(AuditWriterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(options: AuditWriteOptions): Promise<void> {
    const ctx = getAuditContext();
    const entityId = options.entityId ?? null;
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: options.userId ?? ctx.userId ?? null,
          userEmail: options.userEmail ?? ctx.userEmail ?? null,
          action: options.action,
          entityType: options.entityType,
          entityId: isUuid(entityId) ? entityId : null,
          oldValues: (options.oldValues as any) ?? undefined,
          newValues: (options.newValues as any) ?? undefined,
          ipAddress: options.ip ?? ctx.ip ?? null,
          userAgent: options.userAgent ?? ctx.userAgent ?? null,
        },
      });
    } catch (err) {
      // Never break the main flow because of an audit failure.
      this.logger.error('Failed to write audit log', err as Error);
    }
  }
}
