import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MeetingRecording } from '../entities';

@Injectable()
export class MeetingRecordingRepository extends Repository<MeetingRecording> {
  constructor(private dataSource: DataSource) {
    super(MeetingRecording, dataSource.createEntityManager());
  }

  async findByMeetingId(meetingId: string): Promise<MeetingRecording[]> {
    return this.find({
      where: { meetingId },
      order: { createdAt: 'ASC' },
      relations: ['participant', 'participant.user'],
    });
  }
}
