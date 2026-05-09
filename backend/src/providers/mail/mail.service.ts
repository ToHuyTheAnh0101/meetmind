import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Gửi thư mời tham gia cuộc họp
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

      await this.mailerService.sendMail({
        to,
        subject: `[MeetMind] Lời mời tham gia cuộc họp: ${meetingTitle}`,
        template: './invitation', // Tên file template .hbs
        context: {
          name: inviteeName,
          title: meetingTitle,
          date: formattedDate,
          joinUrl,
          password: password || 'Không có',
        },
      });
      this.logger.log(`Đã gửi thư mời họp tới: ${to}`);
    } catch (error) {
      this.logger.error(`Lỗi khi gửi thư mời tới ${to}:`, error);
    }
  }

  /**
   * Gửi thư nhắc lịch trước giờ họp
   */
  async sendMeetingReminder(
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

      await this.mailerService.sendMail({
        to,
        subject: `[MeetMind] Nhắc lịch: Cuộc họp "${meetingTitle}" sắp bắt đầu`,
        template: './reminder',
        context: {
          name: inviteeName,
          title: meetingTitle,
          date: formattedDate,
          joinUrl,
          password: password || null,
        },
      });
      this.logger.log(`Đã gửi nhắc lịch tới: ${to}`);
    } catch (error) {
      this.logger.error(`Lỗi khi gửi nhắc lịch tới ${to}:`, error);
    }
  }
}
