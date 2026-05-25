import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MeetingPoll, PollType } from '../entities/meeting-poll.entity';
import { MeetingPermission } from '../../meetings/entities';
import { PollRepository } from '../repositories/poll.repository';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';
import { ParticipantRepository } from '../../meetings/repositories/participant.repository';

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

  async vote(
    id: string,
    userId: string,
    optionId: string,
  ): Promise<MeetingPoll> {
    const poll = await this.findById(id);

    if (poll.closedAt) {
      throw new BadRequestException('Poll is closed');
    }

    const targetOption = poll.options.find((o) => o.id === optionId);
    if (!targetOption) {
      throw new BadRequestException('Option not found');
    }

    if (poll.type === PollType.SINGLE || !poll.type) {
      // Single choice logic
      const currentVoteIdx = poll.options.findIndex((opt) =>
        opt.voterIds.includes(userId),
      );

      if (currentVoteIdx !== -1) {
        const currentOptionId = poll.options[currentVoteIdx].id;
        // If clicking the same option, remove the vote (un-vote)
        if (currentOptionId === optionId) {
          poll.options[currentVoteIdx].voterIds = poll.options[
            currentVoteIdx
          ].voterIds.filter((id) => id !== userId);
        } else {
          // Switch vote: remove from old, add to new
          poll.options[currentVoteIdx].voterIds = poll.options[
            currentVoteIdx
          ].voterIds.filter((id) => id !== userId);
          targetOption.voterIds.push(userId);
        }
      } else {
        // First time voting
        targetOption.voterIds.push(userId);
      }
    } else {
      // Multiple choice logic (Toggle)
      if (targetOption.voterIds.includes(userId)) {
        // Already voted for this option -> Remove it
        targetOption.voterIds = targetOption.voterIds.filter(
          (id) => id !== userId,
        );
      } else {
        // Not voted yet -> Add it
        targetOption.voterIds.push(userId);
      }
    }

    // Force TypeORM to see the change in JSONB column by re-assigning the array
    poll.options = [...poll.options];

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
