import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DoctorResolver } from './doctor.resolver';
import { DoctorService } from './doctor.service';

@Module({
  imports: [AuthModule],
  providers: [DoctorService, DoctorResolver],
  exports: [DoctorService],
})
export class DoctorModule {}
