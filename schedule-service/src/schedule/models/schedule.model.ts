import { Field, ObjectType } from '@nestjs/graphql';
import { Customer } from '../../customer/models/customer.model';
import { Doctor } from '../../doctor/models/doctor.model';

@ObjectType()
export class Schedule {
  @Field()
  id: string;

  @Field()
  objective: string;

  @Field()
  customerId: string;

  @Field()
  doctorId: string;

  @Field()
  scheduledAt: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => Customer)
  customer: Customer;

  @Field(() => Doctor)
  doctor: Doctor;
}
