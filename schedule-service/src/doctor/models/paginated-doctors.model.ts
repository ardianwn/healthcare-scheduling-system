import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Doctor } from './doctor.model';

@ObjectType()
export class PaginatedDoctors {
  @Field(() => [Doctor])
  doctors: Doctor[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
