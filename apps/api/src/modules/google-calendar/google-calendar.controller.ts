import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('google-calendar')
@Controller('google')
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) {}

  @Get('auth')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Google OAuth authorization URL' })
  getAuthUrl(@CurrentUser('id') userId: string) {
    const url = this.googleCalendarService.getAuthUrl();
    // Append user ID as state parameter so we know who to associate the token with
    const authUrl = `${url}&state=${userId}`;
    return { url: authUrl };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    await this.googleCalendarService.handleCallback(code, userId);
    const frontendUrl = this.configService.get('app.corsOrigin') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/settings?google=connected`);
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if Google Calendar is connected' })
  async getStatus(@CurrentUser('id') userId: string) {
    const connected = await this.googleCalendarService.isConnected(userId);
    return { connected };
  }

  @Get('events')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List Google Calendar events for a date range' })
  async listEvents(
    @CurrentUser('id') userId: string,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax: string,
  ) {
    const events = await this.googleCalendarService.listEvents(userId, timeMin, timeMax);
    return events.map((e) => ({
      id: e.id,
      title: e.summary || '(Sin título)',
      description: e.description || null,
      startDatetime: e.start?.dateTime || e.start?.date || null,
      endDatetime: e.end?.dateTime || e.end?.date || null,
      source: 'google' as const,
      htmlLink: e.htmlLink || null,
    }));
  }

  @Delete('disconnect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disconnect Google Calendar' })
  async disconnect(@CurrentUser('id') userId: string) {
    return this.googleCalendarService.disconnect(userId);
  }
}
