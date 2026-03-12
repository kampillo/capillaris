import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  channel: 'internal' | 'email';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(
      `Sending ${payload.channel} notification to ${payload.to}: ${payload.subject}`,
    );

    // TODO: Implement actual notification sending
    // - For 'email': integrate with email provider (e.g., SendGrid, SES)
    // - For 'internal': store in a notifications table for in-app display

    return true;
  }

  async processReminders(): Promise<void> {
    const pendingReminders = await this.prisma.reminder.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        patient: true,
      },
    });

    this.logger.log(
      `Processing ${pendingReminders.length} pending reminders`,
    );

    for (const reminder of pendingReminders) {
      try {
        await this.sendNotification({
          to: reminder.patient.email || reminder.patient.celular || '',
          subject: `Reminder: ${reminder.reminderType}`,
          body: reminder.messageTemplate || 'You have a reminder',
          channel: reminder.channel as 'internal' | 'email',
        });

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to send reminder ${reminder.id}: ${errorMessage}`,
        );

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: 'failed',
            errorMessage,
          },
        });
      }
    }
  }
}
