import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateDoctorInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;
}
