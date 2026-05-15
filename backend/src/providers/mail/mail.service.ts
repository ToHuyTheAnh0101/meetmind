import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue('mail-queue') private readonly mailQueue: Queue) {}

  /**
   * Gửi thư mời tham gia cuộc họp (Background Job)
   */
  async sendMeetingInvitation(
    to: string,
    inviteeName: string,
    meetingTitle: string,
    startTime: Date,
    joinUrl: string,
    password?: string,
  ) {
    try {
      const formattedDate = new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(startTime);

      await this.mailQueue.add('send-invitation', {
        to,
        name: inviteeName,
        title: meetingTitle,
        date: formattedDate,
        joinUrl,
        password: password || 'Không có',
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      });

      this.logger.log(`Đã thêm job gửi thư mời họp tới: ${to}`);
    } catch (error) {
      this.logger.error(`Lỗi khi thêm job gửi thư mời tới ${to}:`, error);
    }
  }

  /**
   * Lên lịch hoặc cập nhật thư nhắc lịch (Background Job)
   */
  async scheduleMeetingReminder(
    to: string,
    inviteeName: string,
    meetingId: string,
    meetingTitle: string,
    startTime: Date,
    reminderMinutes: number,
    joinUrl: string,
    password?: string,
  ) {
    try {
      const now = new Date();
      const remindAt = new Date(startTime.getTime() - reminderMinutes * 60000);
      const delay = remindAt.getTime() - now.getTime();

      const jobId = `reminder:${meetingId}:${to}`;

      // 1. Xóa job cũ nếu đang đợi
      const oldJob = await this.mailQueue.getJob(jobId);
      if (oldJob) {
        await oldJob.remove();
        this.logger.log(`Đã xóa job cũ: ${jobId}`);
      }

      // 2. Nếu thời gian nhắc nhở đã trôi qua, không tạo job mới
      if (delay <= 0) {
        this.logger.warn(
          `Thời gian nhắc lịch cho ${to} đã trôi qua (delay: ${delay}ms). Bỏ qua.`,
        );
        return;
      }

      const formattedDate = new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(startTime);

      await this.mailQueue.add(
        'send-reminder',
        {
          to,
          name: inviteeName,
          title: meetingTitle,
          date: formattedDate,
          joinUrl,
          password: password || null,
          reminderMinutes, // Thêm trường này
        },
        {
          jobId, // Unique ID để tránh trùng lặp và dễ quản lý
          delay, // Độ trễ tính bằng ms
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(
        `Đã lên lịch nhắc họp tới ${to} sau ${Math.round(delay / 1000 / 60)} phút`,
      );
    } catch (error) {
      this.logger.error(`Lỗi khi lên lịch nhắc lịch tới ${to}:`, error);
    }
  }

  /**
   * Hủy nhắc lịch cho một người dùng hoặc toàn bộ cuộc họp
   */
  async removeMeetingReminder(meetingId: string, email: string) {
    const jobId = `reminder:${meetingId}:${email}`;
    const job = await this.mailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Đã hủy nhắc lịch: ${jobId}`);
    }
  }
}
