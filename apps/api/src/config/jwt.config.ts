import { registerAs } from '@nestjs/config';

export function requireJwtSecret(secret?: string): string {
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET debe configurarse explícitamente con al menos 32 caracteres');
  }
  return secret;
}

export default registerAs('jwt', () => ({
  secret: requireJwtSecret(process.env.JWT_SECRET),
  expiration: process.env.JWT_EXPIRATION || '24h',
}));
