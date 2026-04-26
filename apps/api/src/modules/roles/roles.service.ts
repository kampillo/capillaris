import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }
}
