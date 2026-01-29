import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Min } from 'class-validator';

@ArgsType()
export class CustomersArgs {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
