import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getAuditContext } from '../common/audit/audit-context';
import { isUuid, maskSensitive } from '../common/audit/sensitive-fields';

const SKIP_AUDIT_MODELS: ReadonlySet<string> = new Set([
  // Avoid recursion — audit_log writes generate their own writes otherwise.
  'AuditLog',
  // High-volume / system tables that would drown the audit log.
  'IntegrationSyncLog',
  'Notification',
]);

const SINGLE_WRITE_ACTIONS = new Set<Prisma.PrismaAction>([
  'create',
  'update',
  'upsert',
  'delete',
]);

const BULK_WRITE_ACTIONS = new Set<Prisma.PrismaAction>([
  'createMany',
  'updateMany',
  'deleteMany',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    this.$use(async (params, next) => {
      if (!params.model) return next(params);
      if (SKIP_AUDIT_MODELS.has(params.model)) return next(params);

      const isSingle = SINGLE_WRITE_ACTIONS.has(params.action);
      const isBulk = BULK_WRITE_ACTIONS.has(params.action);
      if (!isSingle && !isBulk) return next(params);

      // Pre-fetch the old row for update/delete on a single record.
      let oldValues: any = null;
      if (
        (params.action === 'update' || params.action === 'delete') &&
        params.args?.where
      ) {
        try {
          const delegate = this.getDelegate(params.model);
          oldValues = await delegate.findUnique({ where: params.args.where });
        } catch {
          // ignore — fall back to no oldValues
        }
      }

      const result = await next(params);

      try {
        await this.writeAudit(params, result, oldValues);
      } catch (err) {
        this.logger.error('Audit write failed', err as Error);
      }

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private getDelegate(model: string): any {
    const key = model.charAt(0).toLowerCase() + model.slice(1);
    return (this as any)[key];
  }

  private async writeAudit(
    params: Prisma.MiddlewareParams,
    result: any,
    oldValues: any,
  ) {
    const ctx = getAuditContext();
    const entityType = params.model!.charAt(0).toLowerCase() + params.model!.slice(1);

    let action: string;
    let oldVals: unknown = null;
    let newVals: unknown = null;
    let entityId: string | null = null;

    switch (params.action) {
      case 'create':
      case 'upsert': {
        action = 'CREATE';
        newVals = maskSensitive(result);
        entityId = result?.id ?? null;
        break;
      }
      case 'update': {
        const data = params.args?.data ?? {};
        const isSoftDelete =
          'deletedAt' in data &&
          data.deletedAt != null &&
          oldValues &&
          oldValues.deletedAt == null;
        action = isSoftDelete ? 'DELETE' : 'UPDATE';
        oldVals = maskSensitive(oldValues);
        newVals = maskSensitive(result);
        entityId = result?.id ?? oldValues?.id ?? null;
        break;
      }
      case 'delete': {
        action = 'DELETE';
        oldVals = maskSensitive(oldValues);
        entityId = oldValues?.id ?? result?.id ?? null;
        break;
      }
      case 'createMany': {
        action = 'CREATE_MANY';
        newVals = { count: result?.count, data: maskSensitive(params.args?.data) };
        break;
      }
      case 'updateMany': {
        action = 'UPDATE_MANY';
        newVals = {
          count: result?.count,
          where: params.args?.where,
          data: maskSensitive(params.args?.data),
        };
        break;
      }
      case 'deleteMany': {
        action = 'DELETE_MANY';
        newVals = { count: result?.count, where: params.args?.where };
        break;
      }
      default:
        return;
    }

    await this.auditLog.create({
      data: {
        userId: ctx.userId ?? null,
        userEmail: ctx.userEmail ?? null,
        action,
        entityType,
        entityId: isUuid(entityId) ? entityId : null,
        oldValues: (oldVals as any) ?? undefined,
        newValues: (newVals as any) ?? undefined,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });
  }
}

