import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Customer } from './customer.model';

@ObjectType()
export class PaginatedCustomers {
  @Field(() => [Customer])
  customers: Customer[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
