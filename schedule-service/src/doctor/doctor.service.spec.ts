import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorService } from './doctor.service';

describe('DoctorService', () => {
  let service: DoctorService;
  let prismaService: PrismaService;
  let cacheManager: Cache;

  const mockPrismaService = {
    doctor: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
        DoctorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        doctors: [{ id: '1', name: 'Dr. Smith', specialization: 'Cardiology' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('doctors:page:1:limit:10');
      expect(mockPrismaService.doctor.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if no cache exists', async () => {
      const doctors = [
        { id: '1', name: 'Dr. Smith', specialization: 'Cardiology', licenseNumber: 'LIC001' },
        { id: '2', name: 'Dr. Johnson', specialization: 'Neurology', licenseNumber: 'LIC002' },
      ];

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.doctor.findMany.mockResolvedValue(doctors);
      mockPrismaService.doctor.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        doctors,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPrismaService.doctor.findMany).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'doctors:page:1:limit:10',
        expect.any(Object),
        300000,
      );
    });
  });

  describe('findOne', () => {
    it('should return a doctor by id', async () => {
      const doctor = {
        id: '1',
        name: 'Dr. Smith',
        specialization: 'Cardiology',
        licenseNumber: 'LIC001',
      };

      mockPrismaService.doctor.findUnique.mockResolvedValue(doctor);

      const result = await service.findOne('1');

      expect(result).toEqual(doctor);
      expect(mockPrismaService.doctor.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if doctor not found', async () => {
      mockPrismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new doctor and clear cache', async () => {
      const createInput = {
        name: 'Dr. Smith',
        specialization: 'Cardiology',
        licenseNumber: 'LIC001',
      };

      const createdDoctor = { id: '1', ...createInput };

      mockPrismaService.doctor.create.mockResolvedValue(createdDoctor);

      const result = await service.create(createInput);

      expect(result).toEqual(createdDoctor);
      expect(mockPrismaService.doctor.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a doctor and clear cache', async () => {
      const updateInput = {
        name: 'Dr. Smith Updated',
        specialization: 'Cardiology & Surgery',
      };

      const existingDoctor = {
        id: '1',
        name: 'Dr. Smith',
        specialization: 'Cardiology',
        licenseNumber: 'LIC001',
      };

      const updatedDoctor = { ...existingDoctor, ...updateInput };

      mockPrismaService.doctor.findUnique.mockResolvedValue(existingDoctor);
      mockPrismaService.doctor.update.mockResolvedValue(updatedDoctor);

      const result = await service.update('1', updateInput);

      expect(result).toEqual(updatedDoctor);
    });

    it('should throw NotFoundException if doctor not found', async () => {
      mockPrismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.update('999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a doctor and clear cache', async () => {
      const doctor = {
        id: '1',
        name: 'Dr. Smith',
        specialization: 'Cardiology',
        licenseNumber: 'LIC001',
      };

      mockPrismaService.doctor.findUnique.mockResolvedValue(doctor);
      mockPrismaService.doctor.delete.mockResolvedValue(doctor);

      const result = await service.remove('1');

      expect(result).toEqual(doctor);
      expect(mockPrismaService.doctor.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if doctor not found', async () => {
      mockPrismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
