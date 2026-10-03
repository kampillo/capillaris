import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) nombre?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) apellido?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() @MaxLength(72) currentPassword: string;
  // bcrypt operates on at most 72 bytes: the service also checks UTF-8 byte length.
  @IsString() @MinLength(12) @MaxLength(72)
  @Matches(/\S/u, { message: 'La contraseña no puede contener sólo espacios' })
  newPassword: string;
}
