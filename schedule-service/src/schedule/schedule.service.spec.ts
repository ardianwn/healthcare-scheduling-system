import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { CustomerService } from '../customer/customer.service';
import { DoctorService } from '../doctor/doctor.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prismaService: PrismaService;
  let customerService: CustomerService;
  let doctorService: DoctorService;
  let emailService: EmailService;
  let cacheManager: Cache;

  const mockPrismaService = {
    schedule: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCustomerService = {
    findOne: jest.fn(),
  };

  const mockDoctorService = {
    findOne: jest.fn(),
  };

  const mockEmailService = {
    sendScheduleNotification: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
        {
          provide: DoctorService,
          useValue: mockDoctorService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    prismaService = module.get<PrismaService>(PrismaService);
    customerService = module.get<CustomerService>(CustomerService);
    doctorService = module.get<DoctorService>(DoctorService);
    emailService = module.get<EmailService>(EmailService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a schedule and send email notification', async () => {
      const createInput = {
        customerId: 'customer-1',
        doctorId: 'doctor-1',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        objective: 'Checkup',
      };

      const customer = {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@test.com',
        phone: '123',
        address: 'addr',
      };

      const doctor = {
        id: 'doctor-1',
        name: 'Dr. Smith',
        specialization: 'Cardiology',
        licenseNumber: 'LIC001',
      };

      const createdSchedule = {
        id: 'schedule-1',
        customerId: createInput.customerId,
        doctorId: createInput.doctorId,
        scheduledAt: new Date(createInput.scheduledAt),
        objective: createInput.objective,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: customer,
        doctor: doctor,
      };

      mockCustomerService.findOne.mockResolvedValue(customer);
      mockDoctorService.findOne.mockResolvedValue(doctor);
      mockPrismaService.schedule.findUnique.mockResolvedValue(null);
      mockPrismaService.schedule.create.mockResolvedValue(createdSchedule);

      const result = await service.create(createInput);

      expect(result).toEqual(createdSchedule);
      expect(mockEmailService.sendScheduleNotification).toHaveBeenCalledWith({
        customerName: customer.name,
        customerEmail: customer.email,
        doctorName: doctor.name,
        scheduledAt: expect.any(Date),
        objective: createInput.objective,
        action: 'created',
      });
    });

    it('should throw BadRequestException if date is in the past', async () => {
      const createInput = {
        customerId: 'customer-1',
        doctorId: 'doctor-1',
        scheduledAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
        objective: 'Checkup',
      };

      await expect(service.create(createInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return cached schedules if available', async () => {
      const cachedData = {
        schedules: [
          {
            id: '1',
            customerId: 'customer-1',
            doctorId: 'doctor-1',
            scheduledAt: new Date(),
            objective: 'Checkup',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPrismaService.schedule.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if no cache exists', async () => {
      const schedules = [
        {
          id: '1',
          customerId: 'customer-1',
          doctorId: 'doctor-1',
          scheduledAt: new Date(),
          objective: 'Checkup',
          customer: { name: 'John' },
          doctor: { name: 'Dr. Smith' },
        },
      ];

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.schedule.findMany.mockResolvedValue(schedules);
      mockPrismaService.schedule.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.schedules).toEqual(schedules);
      expect(result.total).toBe(1);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a schedule and send cancellation email', async () => {
      const schedule = {
        id: 'schedule-1',
        customerId: 'customer-1',
        doctorId: 'doctor-1',
        scheduledAt: new Date(),
        objective: 'Checkup',
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@test.com',
          phone: '123',
          address: 'addr',
        },
        doctor: {
          id: 'doctor-1',
          name: 'Dr. Smith',
          specialization: 'Cardiology',
          licenseNumber: 'LIC001',
        },
      };

      mockPrismaService.schedule.findUnique.mockResolvedValue(schedule);
      mockPrismaService.schedule.delete.mockResolvedValue(schedule);

      const result = await service.remove('schedule-1');

      expect(result).toEqual(schedule);
      expect(mockEmailService.sendScheduleNotification).toHaveBeenCalledWith({
        customerName: schedule.customer.name,
        customerEmail: schedule.customer.email,
        doctorName: schedule.doctor.name,
        scheduledAt: schedule.scheduledAt,
        objective: schedule.objective,
        action: 'cancelled',
      });
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockPrismaService.schedule.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
