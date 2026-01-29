import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';

@InputType()
export class CreateScheduleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  objective: string;

  @Field()
  @IsUUID()
  customerId: string;

  @Field()
  @IsUUID()
  doctorId: string;

  @Field()
  @IsDateString()
  scheduledAt: string;
}
