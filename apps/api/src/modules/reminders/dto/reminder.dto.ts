import { IsDateString, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
export class CreateReminderDto {
  @IsUUID() patientId: string;
  @IsIn(['appointment', 'prescription', 'followup', 'general']) reminderType: string;
  @IsDateString() scheduledFor: string;
  @IsOptional() @IsIn(['internal', 'email']) channel?: string;
  @IsOptional() @IsString() @MaxLength(100) relatedEntityType?: string;
  @IsOptional() @IsUUID() relatedEntityId?: string;
  @IsOptional() @IsString() @MaxLength(5000) messageTemplate?: string;
  @IsOptional() @IsObject() messageVariables?: Record<string, unknown>;
}
export class UpdateReminderDto {
  @IsIn(['pending', 'cancelled']) status: string;
}
