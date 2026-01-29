import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CustomerService } from './customer.service';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomersArgs } from './dto/customers.args';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { Customer } from './models/customer.model';
import { PaginatedCustomers } from './models/paginated-customers.model';

@Resolver(() => Customer)
@UseGuards(GqlAuthGuard)
export class CustomerResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Mutation(() => Customer)
  createCustomer(@Args('input') createCustomerInput: CreateCustomerInput): Promise<Customer> {
    return this.customerService.create(createCustomerInput);
  }

  @Query(() => PaginatedCustomers)
  customers(@Args() args: CustomersArgs): Promise<PaginatedCustomers> {
    return this.customerService.findAll(args);
  }

  @Query(() => Customer)
  customer(@Args('id') id: string): Promise<Customer> {
    return this.customerService.findOne(id);
  }

  @Mutation(() => Customer)
  updateCustomer(
    @Args('id') id: string,
    @Args('input') updateCustomerInput: UpdateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.update(id, updateCustomerInput);
  }

  @Mutation(() => Customer)
  deleteCustomer(@Args('id') id: string): Promise<Customer> {
    return this.customerService.remove(id);
  }
}
