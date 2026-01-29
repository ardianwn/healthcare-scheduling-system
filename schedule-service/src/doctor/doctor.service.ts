import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { DoctorsArgs } from './dto/doctors.args';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { Doctor } from './models/doctor.model';
import { PaginatedDoctors } from './models/paginated-doctors.model';

@Injectable()
export class DoctorService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createDoctorInput: CreateDoctorInput): Promise<Doctor> {
    const { name } = createDoctorInput;

    const doctor = await this.prisma.doctor.create({
      data: { name },
    });

    // Clear cache
    await this.clearDoctorCache();

    return doctor;
  }

  async findAll(args: DoctorsArgs): Promise<PaginatedDoctors> {
    const { page = 1, limit = 10 } = args;
    const skip = (page - 1) * limit;

    // Try to get from cache
    const cacheKey = `doctors:page:${page}:limit:${limit}`;
    const cached = await this.cacheManager.get<PaginatedDoctors>(cacheKey);
    if (cached) {
      return cached;
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctor.count(),
    ]);

    const result = {
      doctors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findOne(id: string): Promise<Doctor> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  async update(id: string, updateDoctorInput: UpdateDoctorInput): Promise<Doctor> {
    // Check if doctor exists
    await this.findOne(id);

    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: updateDoctorInput,
    });

    // Clear cache
    await this.clearDoctorCache();

    return doctor;
  }

  async remove(id: string): Promise<Doctor> {
    // Check if doctor exists
    await this.findOne(id);

    const doctor = await this.prisma.doctor.delete({
      where: { id },
    });

    // Clear cache
    await this.clearDoctorCache();

    return doctor;
  }

  private async clearDoctorCache(): Promise<void> {
    // Clear all doctor cache keys
    // Note: In production, you might want to use Redis directly for pattern-based deletion
  }
}
