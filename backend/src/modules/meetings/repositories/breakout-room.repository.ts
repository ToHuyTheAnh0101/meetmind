import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreakoutRoom } from '../entities';

@Injectable()
export class BreakoutRoomRepository {
  constructor(
    @InjectRepository(BreakoutRoom)
    private readonly repo: Repository<BreakoutRoom>,
  ) {}

  async findById(id: string): Promise<BreakoutRoom | null> {
    return this.repo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .where('room.id = :id', { id })
      .getOne();
  }

  async findByMeetingId(meetingId: string): Promise<BreakoutRoom[]> {
    return this.repo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .where('room.meetingId = :meetingId', { meetingId })
      .orderBy('room.createdAt', 'ASC')
      .getMany();
  }

  create(data: Partial<BreakoutRoom>): BreakoutRoom {
    return this.repo.create(data);
  }

  async save(room: Partial<BreakoutRoom>): Promise<BreakoutRoom> {
    return this.repo.save(room);
  }

  async remove(room: BreakoutRoom): Promise<void> {
    await this.repo.remove(room);
  }

  async removeAllForMeeting(meetingId: string): Promise<void> {
    await this.repo.delete({ meetingId });
  }
}
