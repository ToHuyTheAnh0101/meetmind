import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Meeting, MeetingStatus } from '../entities';

@Injectable()
export class MeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private readonly repo: Repository<Meeting>,
  ) {}

  async findById(id: string): Promise<Meeting | null> {
    return this.repo
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'participantUser')
      .leftJoinAndSelect('meeting.organizer', 'organizer')
      .where('meeting.id = :id', { id })
      .getOne();
  }

  async findAllForUser(
    userId: string,
    userEmail?: string,
    skip?: number,
    take?: number,
    status?: MeetingStatus,
    search?: string,
  ): Promise<[Meeting[], number]> {
    const query = this.repo
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .leftJoinAndSelect('meeting.organizer', 'organizer');

    query.where(
      new Brackets((qb) => {
        qb.where('meeting.organizerId = :userId', { userId }).orWhere(
          'participant.userId = :userId',
          { userId },
        );
        if (userEmail) {
          qb.orWhere('meeting.inviteeEmails @> :emailJson', {
            emailJson: JSON.stringify([userEmail]),
          });
        }
      }),
    );

    if (status) {
      query.andWhere('meeting.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('meeting.title ILIKE :search', {
            search: `%${search}%`,
          }).orWhere('meeting.description ILIKE :search', {
            search: `%${search}%`,
          });
        }),
      );
    }

    query.orderBy('meeting.startTime', 'DESC').distinct(true);

    if (skip !== undefined) {
      query.skip(skip);
    }

    if (take !== undefined) {
      query.take(take);
    }

    return query.getManyAndCount();
  }

  async hasSharedSession(meetingId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.repo.manager
      .createQueryBuilder()
      .select('1')
      .from('meetings', 'meeting')
      .where('meeting.id = :meetingId', { meetingId })
      .andWhere('meeting.sharedEmails @> :emailJson', {
        emailJson: JSON.stringify([normalizedEmail]),
      })
      .getRawOne<object>();
    return !!result;
  }

  create(data: Partial<Meeting>): Meeting {
    return this.repo.create(data);
  }

  async save(meeting: Partial<Meeting>): Promise<Meeting> {
    return this.repo.save(meeting);
  }

  async remove(meeting: Meeting): Promise<void> {
    await this.repo.remove(meeting);
  }

  async findNearestBefore(userId: string, time: Date): Promise<Meeting | null> {
    return this.repo
      .createQueryBuilder('meeting')
      .where('meeting.organizerId = :userId', { userId })
      .andWhere('meeting.startTime < :time', { time })
      .andWhere("meeting.status != 'cancelled'")
      .orderBy('meeting.startTime', 'DESC')
      .getOne();
  }

  async findNearestAfter(userId: string, time: Date): Promise<Meeting | null> {
    return this.repo
      .createQueryBuilder('meeting')
      .where('meeting.organizerId = :userId', { userId })
      .andWhere('meeting.startTime > :time', { time })
      .andWhere("meeting.status != 'cancelled'")
      .orderBy('meeting.startTime', 'ASC')
      .getOne();
  }

  async findExactAt(userId: string, time: Date): Promise<Meeting | null> {
    const nextMinute = new Date(time.getTime() + 60000);
    return this.repo
      .createQueryBuilder('meeting')
      .where('meeting.organizerId = :userId', { userId })
      .andWhere('meeting.startTime >= :time', { time })
      .andWhere('meeting.startTime < :nextMinute', { nextMinute })
      .andWhere("meeting.status != 'cancelled'")
      .getOne();
  }
}
