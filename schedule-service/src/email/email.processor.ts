import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { ScheduleEmailData } from './email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  @Process('schedule-notification')
  async handleScheduleNotification(job: Job<ScheduleEmailData>) {
    const { data } = job;
    this.logger.log(`Processing email for ${data.customerEmail}`);

    try {
      const subject = data.action === 'created' 
        ? 'Appointment Confirmed'
        : 'Appointment Cancelled';

      const htmlContent = this.generateEmailTemplate(data);

      // Send email
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Healthcare System" <noreply@healthcare.com>',
        to: data.customerEmail,
        subject: subject,
        html: htmlContent,
      });

      this.logger.log(`Email sent successfully to ${data.customerEmail}: ${result.messageId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  private generateEmailTemplate(data: ScheduleEmailData): string {
    const action = data.action === 'created' ? 'confirmed' : 'cancelled';
    const scheduledDate = new Date(data.scheduledAt).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment ${action === 'confirmed' ? 'Confirmed' : 'Cancelled'}</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your appointment has been <strong>${action}</strong>.</p>
            
            <div class="info-box">
              <h3>Appointment Details:</h3>
              <p><strong>Doctor:</strong> ${data.doctorName}</p>
              <p><strong>Purpose:</strong> ${data.objective}</p>
              <p><strong>Date & Time:</strong> ${scheduledDate}</p>
            </div>

            ${data.action === 'created' ? `
              <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
              <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
            ` : `
              <p>If this cancellation was made in error, please contact us immediately to reschedule.</p>
            `}
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2026 Healthcare Scheduling System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
