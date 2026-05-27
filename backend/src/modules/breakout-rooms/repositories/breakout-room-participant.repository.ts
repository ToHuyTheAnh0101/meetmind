import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreakoutRoomParticipant } from '../entities/breakout-room-participant.entity';

@Injectable()
export class BreakoutRoomParticipantRepository {
  constructor(
    @InjectRepository(BreakoutRoomParticipant)
    private readonly repo: Repository<BreakoutRoomParticipant>,
  ) {}

  async findByRoomId(
    breakoutRoomId: string,
  ): Promise<BreakoutRoomParticipant[]> {
    return this.repo.find({
      where: { breakoutRoomId },
      relations: ['user'],
    });
  }

  create(data: Partial<BreakoutRoomParticipant>): BreakoutRoomParticipant {
    return this.repo.create(data);
  }

  async save(
    participant: Partial<BreakoutRoomParticipant>,
  ): Promise<BreakoutRoomParticipant> {
    return this.repo.save(participant);
  }

  async saveMany(
    participants: Partial<BreakoutRoomParticipant>[],
  ): Promise<BreakoutRoomParticipant[]> {
    return this.repo.save(participants);
  }

  async remove(participant: BreakoutRoomParticipant): Promise<void> {
    await this.repo.remove(participant);
  }

  async removeAllForRoom(breakoutRoomId: string): Promise<void> {
    await this.repo.delete({ breakoutRoomId });
  }

  async removeForUserInMeeting(
    userId: string,
    meetingId: string,
  ): Promise<void> {
    const records = await this.repo
      .createQueryBuilder('p')
      .innerJoin('p.breakoutRoom', 'r')
      .where('p.userId = :userId', { userId })
      .andWhere('r.meetingId = :meetingId', { meetingId })
      .getMany();

    if (records.length > 0) {
      await this.repo.remove(records);
    }
  }
}
