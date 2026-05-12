import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditAls, AuditContext } from './audit-context';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const ctx: AuditContext = {
      userId: req?.user?.id ?? null,
      userEmail: req?.user?.email ?? null,
      ip:
        (req?.ip as string | undefined) ??
        req?.connection?.remoteAddress ??
        null,
      userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
    };
    return new Observable((subscriber) => {
      auditAls.run(ctx, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
