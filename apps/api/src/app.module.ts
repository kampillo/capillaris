import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import storageConfig from './config/storage.config';
import googleConfig from './config/google.config';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { MedicalConsultationsModule } from './modules/medical-consultations/medical-consultations.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { ClinicalHistoriesModule } from './modules/clinical-histories/clinical-histories.module';
import { MicropigmentationsModule } from './modules/micropigmentations/micropigmentations.module';
import { HairmedicinesModule } from './modules/hairmedicines/hairmedicines.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ImagesModule } from './modules/images/images.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, storageConfig, googleConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    PrescriptionsModule,
    MedicalConsultationsModule,
    ProceduresModule,
    ClinicalHistoriesModule,
    MicropigmentationsModule,
    HairmedicinesModule,
    ProductsModule,
    InventoryModule,
    ReportsModule,
    RemindersModule,
    NotificationsModule,
    ImagesModule,
    CatalogModule,
    GoogleCalendarModule,
  ],
  providers: [
    // Global JWT guard - all routes protected by default, use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global roles guard - use @Roles('admin', 'doctor') to restrict
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
