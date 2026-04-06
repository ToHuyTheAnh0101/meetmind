import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MeetingPoll } from '../entities';
import { PollRepository } from '../repositories/poll.repository';
import { MeetingRepository } from '../repositories/meeting.repository';

@Injectable()
export class PollService {
  constructor(
    private pollRepository: PollRepository,
    private meetingRepository: MeetingRepository,
  ) {}

  async create(
    meetingId: string,
    data: Partial<MeetingPoll>,
  ): Promise<MeetingPoll> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const poll = this.pollRepository.create({
      ...data,
      meetingId,
    });

    return this.pollRepository.save(poll);
  }

  async findById(id: string): Promise<MeetingPoll> {
    const poll = await this.pollRepository.findById(id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return poll;
  }

  async findByMeetingId(meetingId: string): Promise<MeetingPoll[]> {
    return this.pollRepository.findByMeetingId(meetingId);
  }

  async vote(id: string, optionId: string): Promise<MeetingPoll> {
    const poll = await this.findById(id);

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      throw new BadRequestException('Option not found');
    }

    return this.pollRepository.save(poll);
  }

  async close(id: string): Promise<MeetingPoll> {
    const poll = await this.findById(id);

    poll.closedAt = new Date();

    return this.pollRepository.save(poll);
  }
}
