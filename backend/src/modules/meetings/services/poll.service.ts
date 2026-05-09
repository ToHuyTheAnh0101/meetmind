import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MeetingPoll, MeetingPermission } from '../entities';
import { PollRepository } from '../repositories/poll.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
import { ParticipantRepository } from '../repositories/participant.repository';

@Injectable()
export class PollService {
  constructor(
    private pollRepository: PollRepository,
    private meetingRepository: MeetingRepository,
    private participantRepository: ParticipantRepository,
  ) {}

  async create(
    meetingId: string,
    userId: string,
    data: Partial<MeetingPoll>,
  ): Promise<MeetingPoll> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const participant = await this.participantRepository.findByMeetingAndUser(
      meetingId,
      userId,
    );
    if (
      !participant ||
      (!participant.isOrganizer &&
        !participant.permissions.includes(MeetingPermission.MANAGE_POLLS))
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage polls in this meeting',
      );
    }

    const poll = this.pollRepository.create({
      ...data,
      meetingId,
      createdByUserId: userId,
      options: (data.options || []).map((opt) => ({
        ...opt,
        voterIds: [],
      })),
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

  async vote(id: string, userId: string, optionId: string): Promise<MeetingPoll> {
    const poll = await this.findById(id);

    if (poll.closedAt) {
      throw new BadRequestException('Poll is closed');
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      throw new BadRequestException('Option not found');
    }

    // Check if user already voted
    if (poll.type === 'single' || !poll.type) {
      const alreadyVoted = poll.options.some((opt) =>
        opt.voterIds.includes(userId),
      );
      if (alreadyVoted) {
        throw new BadRequestException('User already voted');
      }
    } else {
      // Multiple choice - check if user already voted for THIS option
      const alreadyVotedThisOption = option.voterIds.includes(userId);
      if (alreadyVotedThisOption) {
        throw new BadRequestException('User already voted for this option');
      }
    }

    if (!option.voterIds) {
      option.voterIds = [];
    }
    option.voterIds.push(userId);

    return this.pollRepository.save(poll);
  }

  async close(id: string, userId: string): Promise<MeetingPoll> {
    const poll = await this.findById(id);

    const participant = await this.participantRepository.findByMeetingAndUser(
      poll.meetingId,
      userId,
    );
    if (
      !participant ||
      (!participant.isOrganizer &&
        !participant.permissions.includes(MeetingPermission.MANAGE_POLLS))
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage polls in this meeting',
      );
    }

    if (poll.closedAt) {
      return poll;
    }

    poll.closedAt = new Date();

    return this.pollRepository.save(poll);
  }
}
