import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';

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
      authVersion: user.authVersion,
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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    for (const name of [dto.nombre, dto.apellido]) if (name !== undefined && !name.trim()) throw new BadRequestException('El nombre no puede estar vacío');
    await this.prisma.user.update({ where: { id: userId }, data: {
      ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
      ...(dto.apellido !== undefined && { apellido: dto.apellido.trim() }),
      ...(dto.email !== undefined && { email: dto.email.trim() }),
      updatedBy: userId,
    } });
    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (Buffer.byteLength(dto.newPassword, 'utf8') > 72) {
      throw new BadRequestException('La contraseña supera el límite de 72 bytes');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const changed = await this.prisma.user.updateMany({
      where: { id: userId, passwordHash: user.passwordHash, isActive: true, deletedAt: null },
      data: { passwordHash, authVersion: { increment: 1 }, updatedBy: userId },
    });
    if (changed.count !== 1) throw new UnauthorizedException('La sesión cambió; vuelve a iniciar sesión');
    await this.audit.write({ action: 'UPDATE', entityType: 'user_password', entityId: userId, userId });
    return { ok: true };
  }

  async logout(userId: string, userEmail: string) {
    // Invalidates existing tokens on every device without storing raw bearer tokens.
    await this.prisma.user.update({ where: { id: userId }, data: { authVersion: { increment: 1 } } });
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
