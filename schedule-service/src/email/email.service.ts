import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';

export interface ScheduleEmailData {
  customerEmail: string;
  customerName: string;
  doctorName: string;
  scheduledAt: Date;
  objective: string;
  action: 'created' | 'deleted' | 'cancelled';
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async sendScheduleNotification(data: ScheduleEmailData): Promise<void> {
    try {
      await this.emailQueue.add('schedule-notification', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
      this.logger.log(`Email queued for ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`);
    }
  }
}
