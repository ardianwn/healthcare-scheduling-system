import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bull';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let emailQueue: Queue;

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getQueueToken('email'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailQueue = module.get<Queue>(getQueueToken('email'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendScheduleNotification', () => {
    it('should queue email notification for created schedule', async () => {
      const emailData = {
        customerName: 'John Doe',
        customerEmail: 'john@test.com',
        doctorName: 'Dr. Smith',
        scheduledAt: new Date(),
        objective: 'Regular Checkup',
        action: 'created' as const,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.sendScheduleNotification(emailData);

      expect(mockQueue.add).toHaveBeenCalledWith('schedule-notification', emailData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });

    it('should queue email notification for cancelled schedule', async () => {
      const emailData = {
        customerName: 'Jane Doe',
        customerEmail: 'jane@test.com',
        doctorName: 'Dr. Johnson',
        scheduledAt: new Date(),
        objective: 'Surgery',
        action: 'cancelled' as const,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-2' });

      await service.sendScheduleNotification(emailData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'schedule-notification',
        emailData,
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });

    it('should handle queue errors gracefully', async () => {
      const emailData = {
        customerName: 'Test User',
        customerEmail: 'test@test.com',
        doctorName: 'Dr. Test',
        scheduledAt: new Date(),
        objective: 'Test',
        action: 'created' as const,
      };

      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      // Service catches errors and logs them, doesn't throw
      await expect(service.sendScheduleNotification(emailData)).resolves.not.toThrow();
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
