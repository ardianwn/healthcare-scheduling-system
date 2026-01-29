import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Doctor {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
