import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../models/user.model';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}
