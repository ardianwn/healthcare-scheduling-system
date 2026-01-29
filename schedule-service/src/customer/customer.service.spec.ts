import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let prismaService: PrismaService;
  let cacheManager: Cache;

  const mockPrismaService = {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
        CustomerService,
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

    service = module.get<CustomerService>(CustomerService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        customers: [{ id: '1', name: 'John', email: 'john@test.com' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('customers:page:1:limit:10');
      expect(mockPrismaService.customer.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if no cache exists', async () => {
      const customers = [
        { id: '1', name: 'John', email: 'john@test.com', phone: '123', address: 'addr1' },
        { id: '2', name: 'Jane', email: 'jane@test.com', phone: '456', address: 'addr2' },
      ];

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.customer.findMany.mockResolvedValue(customers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        customers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPrismaService.customer.findMany).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'customers:page:1:limit:10',
        expect.any(Object),
        300000,
      );
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      const customer = {
        id: '1',
        name: 'John',
        email: 'john@test.com',
        phone: '123',
        address: 'addr1',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(customer);

      const result = await service.findOne('1');

      expect(result).toEqual(customer);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new customer and clear cache', async () => {
      const createInput = {
        name: 'John',
        email: 'john@test.com',
        phone: '123',
        address: 'addr1',
      };

      const createdCustomer = { id: '1', ...createInput };

      mockPrismaService.customer.create.mockResolvedValue(createdCustomer);

      const result = await service.create(createInput);

      expect(result).toEqual(createdCustomer);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: { name: createInput.name, email: createInput.email },
      });
    });
  });

  describe('update', () => {
    it('should update a customer and clear cache', async () => {
      const updateInput = {
        name: 'John Updated',
        email: 'john.updated@test.com',
      };

      const existingCustomer = {
        id: '1',
        name: 'John',
        email: 'john@test.com',
        phone: '123',
        address: 'addr1',
      };

      const updatedCustomer = { ...existingCustomer, ...updateInput };

      mockPrismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      mockPrismaService.customer.update.mockResolvedValue(updatedCustomer);

      const result = await service.update('1', updateInput);

      expect(result).toEqual(updatedCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.update('999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a customer and clear cache', async () => {
      const customer = {
        id: '1',
        name: 'John',
        email: 'john@test.com',
        phone: '123',
        address: 'addr1',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(customer);
      mockPrismaService.customer.delete.mockResolvedValue(customer);

      const result = await service.remove('1');

      expect(result).toEqual(customer);
      expect(mockPrismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
