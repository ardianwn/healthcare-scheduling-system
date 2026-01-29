import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CreateScheduleInput } from './dto/create-schedule.input';
import { SchedulesArgs } from './dto/schedules.args';
import { PaginatedSchedules } from './models/paginated-schedules.model';
import { Schedule } from './models/schedule.model';
import { ScheduleService } from './schedule.service';

@Resolver(() => Schedule)
@UseGuards(GqlAuthGuard)
export class ScheduleResolver {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Mutation(() => Schedule)
  createSchedule(@Args('input') createScheduleInput: CreateScheduleInput): Promise<Schedule> {
    return this.scheduleService.create(createScheduleInput);
  }

  @Query(() => PaginatedSchedules)
  schedules(@Args() args: SchedulesArgs): Promise<PaginatedSchedules> {
    return this.scheduleService.findAll(args);
  }

  @Query(() => Schedule)
  schedule(@Args('id') id: string): Promise<Schedule> {
    return this.scheduleService.findOne(id);
  }

  @Mutation(() => Schedule)
  deleteSchedule(@Args('id') id: string): Promise<Schedule> {
    return this.scheduleService.remove(id);
  }
}
