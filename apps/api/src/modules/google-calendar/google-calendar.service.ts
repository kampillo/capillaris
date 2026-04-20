import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('google.clientId'),
      this.configService.get('google.clientSecret'),
      this.configService.get('google.redirectUri'),
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });
  }

  async handleCallback(code: string, userId: string) {
    const { tokens } = await this.oauth2Client.getToken(code);

    await this.prisma.googleToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    this.logger.log(`Google Calendar connected for user ${userId}`);
    return { message: 'Google Calendar conectado exitosamente' };
  }

  async isConnected(userId: string): Promise<boolean> {
    const token = await this.prisma.googleToken.findUnique({
      where: { userId },
    });
    return !!token;
  }

  async disconnect(userId: string) {
    await this.prisma.googleToken.deleteMany({ where: { userId } });
    return { message: 'Google Calendar desconectado' };
  }

  private async getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
    const token = await this.prisma.googleToken.findUnique({
      where: { userId },
    });

    if (!token) return null;

    const client = new google.auth.OAuth2(
      this.configService.get('google.clientId'),
      this.configService.get('google.clientSecret'),
      this.configService.get('google.redirectUri'),
    );

    client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    // Auto-refresh tokens
    client.on('tokens', async (newTokens) => {
      await this.prisma.googleToken.update({
        where: { userId },
        data: {
          accessToken: newTokens.access_token!,
          ...(newTokens.refresh_token && { refreshToken: newTokens.refresh_token }),
          expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        },
      });
    });

    return google.calendar({ version: 'v3', auth: client });
  }

  async createEvent(
    userId: string,
    appointment: {
      title?: string | null;
      description?: string | null;
      startDatetime: Date;
      endDatetime: Date;
      patientName?: string;
    },
  ): Promise<string | null> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) return null;

    try {
      const summary = appointment.title || `Cita - ${appointment.patientName || 'Paciente'}`;

      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description: appointment.description || undefined,
          start: {
            dateTime: appointment.startDatetime.toISOString(),
            timeZone: 'America/Mexico_City',
          },
          end: {
            dateTime: appointment.endDatetime.toISOString(),
            timeZone: 'America/Mexico_City',
          },
        },
      });

      this.logger.log(`Created Google Calendar event: ${event.data.id}`);
      return event.data.id ?? null;
    } catch (error) {
      this.logger.error(`Failed to create Google Calendar event: ${error.message}`);
      return null;
    }
  }

  async updateEvent(
    userId: string,
    eventId: string,
    appointment: {
      title?: string | null;
      description?: string | null;
      startDatetime: Date;
      endDatetime: Date;
      patientName?: string;
      status?: string;
    },
  ): Promise<boolean> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) return false;

    try {
      const summary = appointment.title || `Cita - ${appointment.patientName || 'Paciente'}`;

      // If cancelled, cancel the event in Google Calendar too
      const eventStatus =
        appointment.status === 'cancelled' ? 'cancelled' : 'confirmed';

      await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: {
          summary,
          description: appointment.description || undefined,
          start: {
            dateTime: appointment.startDatetime.toISOString(),
            timeZone: 'America/Mexico_City',
          },
          end: {
            dateTime: appointment.endDatetime.toISOString(),
            timeZone: 'America/Mexico_City',
          },
          status: eventStatus,
        },
      });

      this.logger.log(`Updated Google Calendar event: ${eventId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update Google Calendar event: ${error.message}`);
      return false;
    }
  }

  async listEvents(
    userId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<calendar_v3.Schema$Event[]> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) return [];

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 500,
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error(`Failed to list Google Calendar events: ${error.message}`);
      return [];
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) return false;

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
      this.logger.log(`Deleted Google Calendar event: ${eventId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete Google Calendar event: ${error.message}`);
      return false;
    }
  }
}
