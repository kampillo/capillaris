import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly audit: AuditWriterService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    let user: Awaited<ReturnType<typeof this.validateUser>>;
    try {
      user = await this.validateUser(loginDto.email, loginDto.password);
    } catch (err) {
      await this.audit.write({
        action: 'LOGIN_FAILED',
        entityType: 'auth',
        userEmail: loginDto.email,
        newValues: { email: loginDto.email, reason: (err as Error).message },
      });
      throw err;
    }

    const roles = user.userRoles.map(
      (ur: { role: { name: string } }) => ur.role.name,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.write({
      action: 'LOGIN',
      entityType: 'auth',
      entityId: user.id,
      userId: user.id,
      userEmail: user.email,
    });

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        roles,
      },
    };
  }

  async logout(userId: string, userEmail: string) {
    await this.audit.write({
      action: 'LOGOUT',
      entityType: 'auth',
      entityId: userId,
      userId,
      userEmail,
    });
    return { ok: true };
  }

  async register(dto: RegisterDto) {
    return this.usersService.create(dto);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const roles = user.userRoles.map(
      (ur: any) => ur.role.name,
    );
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur: any) =>
          ur.role.rolePermissions.map((rp: any) => rp.permission.name),
        ),
      ),
    ];

    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      celular: user.celular,
      cedulaProfesional: user.cedulaProfesional,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      roles,
      permissions,
    };
  }
}
