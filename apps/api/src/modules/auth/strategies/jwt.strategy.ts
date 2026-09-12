import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true, deletedAt: true, userRoles: { select: { role: { select: { name: true } } } } },
    });
    if (!user || !user.isActive || user.deletedAt) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.name),
    };
  }
}
