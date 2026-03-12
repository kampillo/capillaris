import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  channel: 'internal' | 'email';
  patientId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.initMailTransporter();
  }

  private initMailTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email transporter configured: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS). Email notifications will be logged only.',
      );
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(
      `Sending ${payload.channel} notification to ${payload.to}: ${payload.subject}`,
    );

    if (payload.channel === 'email') {
      return this.sendEmail(payload);
    }

    // Internal: log for now (consumed via reminders API)
    this.logger.log(`[INTERNAL] ${payload.subject}: ${payload.body}`);
    return true;
  }

  private async sendEmail(payload: NotificationPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (SMTP not configured): to=${payload.to} subject=${payload.subject}`,
      );
      return true; // Don't fail — just log
    }

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@capillaris.com';

    try {
      const info = await this.transporter.sendMail({
        from: `"Capillaris" <${fromAddress}>`,
        to: payload.to,
        subject: payload.subject,
        html: this.buildEmailHtml(payload.subject, payload.body),
      });
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email send failed: ${msg}`);
      throw new Error(`Error al enviar email: ${msg}`);
    }
  }

  private buildEmailHtml(subject: string, body: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px; color: #1a1a1a;">${subject}</h2>
          <div style="color: #4a4a4a; line-height: 1.6;">${body}</div>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center;">
          Capillaris — Sistema de Gestión Médica
        </p>
      </body>
      </html>
    `;
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
        const recipientEmail = reminder.patient.email;
        const recipientPhone = reminder.patient.celular;
        const channel = reminder.channel as 'internal' | 'email';

        // Build message from template + variables
        let messageBody = reminder.messageTemplate || 'Tiene un recordatorio programado.';
        if (reminder.messageVariables) {
          const vars = reminder.messageVariables as Record<string, string>;
          for (const [key, value] of Object.entries(vars)) {
            messageBody = messageBody.replace(`{{${key}}}`, value);
          }
        }

        const subject = `Recordatorio: ${this.getReminderTypeLabel(reminder.reminderType)}`;

        await this.sendNotification({
          to: channel === 'email' ? (recipientEmail || recipientPhone || '') : '',
          subject,
          body: `
            <p>Estimado/a <strong>${reminder.patient.nombre} ${reminder.patient.apellido}</strong>,</p>
            <p>${messageBody}</p>
          `,
          channel,
          patientId: reminder.patientId,
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

  private getReminderTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      appointment: 'Cita',
      prescription: 'Prescripción',
      followup: 'Seguimiento',
      general: 'General',
    };
    return labels[type] || type;
  }
}
