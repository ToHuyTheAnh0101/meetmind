import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScreenCapture } from '../entities';

@Injectable()
export class ScreenCaptureRepository extends Repository<ScreenCapture> {
  constructor(private dataSource: DataSource) {
    super(ScreenCapture, dataSource.createEntityManager());
  }

  async findByMeetingId(meetingId: string): Promise<ScreenCapture[]> {
    return this.find({
      where: { meetingId },
      order: { timestamp: 'ASC' },
    });
  }

  async findById(id: string): Promise<ScreenCapture | null> {
    return this.findOne({ where: { id } });
  }
}
