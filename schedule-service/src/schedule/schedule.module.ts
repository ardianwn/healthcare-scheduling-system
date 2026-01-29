import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';
import { DoctorModule } from '../doctor/doctor.module';
import { EmailModule } from '../email/email.module';
import { ScheduleResolver } from './schedule.resolver';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [AuthModule, CustomerModule, DoctorModule, EmailModule],
  providers: [ScheduleService, ScheduleResolver],
})
export class ScheduleModule {}
