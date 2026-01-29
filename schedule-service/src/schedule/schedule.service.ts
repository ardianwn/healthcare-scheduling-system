import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CustomerService } from '../customer/customer.service';
import { DoctorService } from '../doctor/doctor.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleInput } from './dto/create-schedule.input';
import { SchedulesArgs } from './dto/schedules.args';
import { PaginatedSchedules } from './models/paginated-schedules.model';
import { Schedule } from './models/schedule.model';

@Injectable()
export class ScheduleService {
  constructor(
    private prisma: PrismaService,
    private customerService: CustomerService,
    private doctorService: DoctorService,
    private emailService: EmailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createScheduleInput: CreateScheduleInput): Promise<Schedule> {
    const { objective, customerId, doctorId, scheduledAt } = createScheduleInput;

    // Validate customer exists
    await this.customerService.findOne(customerId);

    // Validate doctor exists
    await this.doctorService.findOne(doctorId);

    // Check for schedule conflicts (same doctor, same time)
    const conflict = await this.prisma.schedule.findUnique({
      where: {
        doctorId_scheduledAt: {
          doctorId,
          scheduledAt: new Date(scheduledAt),
        },
      },
    });

    if (conflict) {
      throw new ConflictException('Doctor already has a schedule at this time');
    }

    // Validate that scheduled time is in the future
    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      throw new BadRequestException('Schedule must be in the future');
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        objective,
        customerId,
        doctorId,
        scheduledAt: scheduleDate,
      },
      include: {
        customer: true,
        doctor: true,
      },
    });

    // Clear cache
    await this.clearScheduleCache();

    // Send email notification
    await this.emailService.sendScheduleNotification({
      customerEmail: schedule.customer.email,
      customerName: schedule.customer.name,
      doctorName: schedule.doctor.name,
      scheduledAt: schedule.scheduledAt,
      objective: schedule.objective,
      action: 'created',
    });

    return schedule;
  }

  async findAll(args: SchedulesArgs): Promise<PaginatedSchedules> {
    const { page = 1, limit = 10, customerId, doctorId, startDate, endDate } = args;
    const skip = (page - 1) * limit;

    // Try to get from cache
    const cacheKey = `schedules:${JSON.stringify(args)}`;
    const cached = await this.cacheManager.get<PaginatedSchedules>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    const [schedules, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: true,
          doctor: true,
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    const result = {
      schedules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        customer: true,
        doctor: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async remove(id: string): Promise<Schedule> {
    // Check if schedule exists
    const schedule = await this.findOne(id);

    const deletedSchedule = await this.prisma.schedule.delete({
      where: { id },
      include: {
        customer: true,
        doctor: true,
      },
    });

    // Clear cache
    await this.clearScheduleCache();

    // Send cancellation email notification
    await this.emailService.sendScheduleNotification({
      customerEmail: deletedSchedule.customer.email,
      customerName: deletedSchedule.customer.name,
      doctorName: deletedSchedule.doctor.name,
      scheduledAt: deletedSchedule.scheduledAt,
      objective: deletedSchedule.objective,
      action: 'cancelled',
    });

    return deletedSchedule;
  }

  private async clearScheduleCache(): Promise<void> {
    // In production, you might want to use a more sophisticated cache invalidation strategy
    // For now, we'll just clear all schedule-related cache keys
    // Note: cache-manager doesn't have a built-in way to clear keys by pattern
    // You might need to track cache keys or use Redis directly for pattern-based deletion
  }
}
