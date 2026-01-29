import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { DoctorService } from './doctor.service';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { DoctorsArgs } from './dto/doctors.args';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { Doctor } from './models/doctor.model';
import { PaginatedDoctors } from './models/paginated-doctors.model';

@Resolver(() => Doctor)
@UseGuards(GqlAuthGuard)
export class DoctorResolver {
  constructor(private readonly doctorService: DoctorService) {}

  @Mutation(() => Doctor)
  createDoctor(@Args('input') createDoctorInput: CreateDoctorInput): Promise<Doctor> {
    return this.doctorService.create(createDoctorInput);
  }

  @Query(() => PaginatedDoctors)
  doctors(@Args() args: DoctorsArgs): Promise<PaginatedDoctors> {
    return this.doctorService.findAll(args);
  }

  @Query(() => Doctor)
  doctor(@Args('id') id: string): Promise<Doctor> {
    return this.doctorService.findOne(id);
  }

  @Mutation(() => Doctor)
  updateDoctor(
    @Args('id') id: string,
    @Args('input') updateDoctorInput: UpdateDoctorInput,
  ): Promise<Doctor> {
    return this.doctorService.update(id, updateDoctorInput);
  }

  @Mutation(() => Doctor)
  deleteDoctor(@Args('id') id: string): Promise<Doctor> {
    return this.doctorService.remove(id);
  }
}
