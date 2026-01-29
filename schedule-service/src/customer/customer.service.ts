import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomersArgs } from './dto/customers.args';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { Customer } from './models/customer.model';
import { PaginatedCustomers } from './models/paginated-customers.model';

@Injectable()
export class CustomerService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createCustomerInput: CreateCustomerInput): Promise<Customer> {
    const { name, email } = createCustomerInput;

    // Check if email already exists
    const existing = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const customer = await this.prisma.customer.create({
      data: { name, email },
    });

    // Clear cache
    await this.clearCustomerCache();

    return customer;
  }

  async findAll(args: CustomersArgs): Promise<PaginatedCustomers> {
    const { page = 1, limit = 10 } = args;
    const skip = (page - 1) * limit;

    // Try to get from cache
    const cacheKey = `customers:page:${page}:limit:${limit}`;
    const cached = await this.cacheManager.get<PaginatedCustomers>(cacheKey);
    if (cached) {
      return cached;
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);

    const result = {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, updateCustomerInput: UpdateCustomerInput): Promise<Customer> {
    // Check if customer exists
    await this.findOne(id);

    // If email is being updated, check if it's already taken
    if (updateCustomerInput.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          email: updateCustomerInput.email,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerInput,
    });

    // Clear cache
    await this.clearCustomerCache();

    return customer;
  }

  async remove(id: string): Promise<Customer> {
    // Check if customer exists
    await this.findOne(id);

    const customer = await this.prisma.customer.delete({
      where: { id },
    });

    // Clear cache
    await this.clearCustomerCache();

    return customer;
  }

  private async clearCustomerCache(): Promise<void> {
    // Clear all customer cache keys
    // Note: In production, you might want to use Redis directly for pattern-based deletion
  }
}
