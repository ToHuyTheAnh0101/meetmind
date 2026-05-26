import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

interface InvitationJobData {
  to: string;
  name: string;
  title: string;
  date: string;
  joinUrl: string;
  password?: string;
}

interface ReminderJobData {
  to: string;
  name: string;
  title: string;
  date: string;
  joinUrl: string;
  password?: string;
  reminderMinutes: number;
}

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(
    job: Job<InvitationJobData | ReminderJobData, any, string>,
  ): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);

    switch (job.name) {
      case 'send-invitation':
        return this.handleSendInvitation(job.data as InvitationJobData);
      case 'send-reminder':
        return this.handleSendReminder(job.data as ReminderJobData);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendInvitation(data: InvitationJobData) {
    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `[MeetMind] Lời mời tham gia cuộc họp: ${data.title}`,
        template: './invitation',
        context: {
          name: data.name,
          title: data.title,
          date: data.date,
          joinUrl: data.joinUrl,
          password: data.password,
        },
      });
      this.logger.log(`Invitation sent to ${data.to}`);
    } catch (error) {
      const err = error as { stack?: string };
      this.logger.error(`Failed to send invitation to ${data.to}`, err.stack);
      throw error;
    }
  }

  private async handleSendReminder(data: ReminderJobData) {
    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `[MeetMind] Nhắc lịch: Cuộc họp "${data.title}" sắp bắt đầu`,
        template: './reminder',
        context: {
          name: data.name,
          title: data.title,
          date: data.date,
          joinUrl: data.joinUrl,
          password: data.password,
          reminderMinutes: data.reminderMinutes,
        },
      });
      this.logger.log(`Reminder sent to ${data.to}`);
    } catch (error) {
      const err = error as { stack?: string };
      this.logger.error(`Failed to send reminder to ${data.to}`, err.stack);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
  }
}
