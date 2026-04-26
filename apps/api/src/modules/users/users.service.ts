import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserWithRoles = {
  userRoles: { role: { id: string; name: string; displayName: string } }[];
  passwordHash: string;
} & Record<string, any>;

function toPublicUser(user: UserWithRoles) {
  const { passwordHash, userRoles, ...rest } = user;
  return {
    ...rest,
    roles: userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      displayName: ur.role.displayName,
    })),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const { password, roleId, ...rest } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { ...rest, passwordHash },
      });
      if (roleId) {
        await tx.userRole.create({
          data: { userId: created.id, roleId },
        });
      }
      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { userRoles: { include: { role: true } } },
      });
    });

    return toPublicUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toPublicUser);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return toPublicUser(user);
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    const { roleId, ...rest } = updateUserDto;

    const user = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(rest).length > 0) {
        await tx.user.update({ where: { id }, data: rest });
      }
      if (roleId !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({ data: { userId: id, roleId } });
      }
      return tx.user.findUniqueOrThrow({
        where: { id },
        include: { userRoles: { include: { role: true } } },
      });
    });

    return toPublicUser(user);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
