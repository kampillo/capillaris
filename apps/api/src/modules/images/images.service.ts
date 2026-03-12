import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadImageDto } from './dto/upload-image.dto';

@Injectable()
export class ImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: UploadImageDto, userId?: string) {
    return this.prisma.patientImage.create({
      data: {
        ...dto,
        uploadedBy: userId,
      } as any,
      include: {
        patient: true,
      },
    });
  }

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.patientImage.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
        },
      }),
      this.prisma.patientImage.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findByPatient(patientId: string) {
    return this.prisma.patientImage.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const image = await this.prisma.patientImage.findUnique({
      where: { id },
      include: {
        patient: true,
        procedureReport: true,
      },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  async update(
    id: string,
    data: { isFavorite?: boolean; isBefore?: boolean; isAfter?: boolean; imageType?: string },
  ) {
    await this.findOne(id);
    return this.prisma.patientImage.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const image = await this.findOne(id);
    // TODO: Delete from S3 storage
    await this.prisma.patientImage.delete({ where: { id } });
    return image;
  }
}
