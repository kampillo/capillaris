import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('donor-zones')
  @ApiOperation({ summary: 'List all donor zones' })
  donorZones() {
    return this.prisma.donorZone.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('variants')
  @ApiOperation({ summary: 'List all variants (Norwood scale)' })
  variants() {
    return this.prisma.variant.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('hair-types')
  @ApiOperation({ summary: 'List all hair types' })
  hairTypes() {
    return this.prisma.hairType.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('doctors')
  @ApiOperation({ summary: 'List all doctors (users with doctor role)' })
  async doctors() {
    const doctors = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        userRoles: { some: { role: { name: 'doctor' } } },
      },
      select: { id: true, nombre: true, apellido: true, email: true },
      orderBy: { nombre: 'asc' },
    });
    return doctors;
  }
}
