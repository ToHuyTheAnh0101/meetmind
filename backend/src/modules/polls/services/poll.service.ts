import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MeetingPoll, PollType } from '../entities/meeting-poll.entity';
import { MeetingPermission } from '../../meetings/entities';
import { PollRepository } from '../repositories/poll.repository';
import { MeetingSessionRepository } from '../../meetings/repositories/meeting-session.repository';
import { ParticipantRepository } from '../../meetings/repositories/participant.repository';
import { MeetingSessionsService } from '../../meetings/services/meeting-sessions.service';
import { EntityManager } from 'typeorm';
import {
  MeetingEvent,
  EventType,
} from '../../events/entities/meeting-event.entity';

@Injectable()
export class PollService {
  constructor(
    private pollRepository: PollRepository,
    private sessionRepository: MeetingSessionRepository,
    private participantRepository: ParticipantRepository,
    private sessionsService: MeetingSessionsService,
    private entityManager: EntityManager,
  ) {}

  async create(
    meetingId: string,
    userId: string,
    data: Partial<MeetingPoll>,
  ): Promise<MeetingPoll> {
    // Auto-ensure session exists (will create if needed)
    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);

    const participant = await this.participantRepository.findByMeetingAndUser(
      session.meetingId,
      userId,
    );
    if (
      !participant ||
      (!participant.isOrganizer &&
        !participant.permissions?.includes(MeetingPermission.MANAGE_POLLS))
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage polls in this meeting',
      );
    }

    const poll = this.pollRepository.create({
      ...data,
      sessionId: session.id,
      createdByUserId: userId,
      options: (data.options || []).map((opt) => ({
        ...opt,
        voterIds: [],
      })),
    });

    const savedPoll = await this.pollRepository.save(poll);

    // Log POLL_STARTED event
    try {
      const newEvent = this.entityManager.create(MeetingEvent, {
        sessionId: session.id,
        type: EventType.POLL_STARTED,
        triggeredByUserId: userId,
        metadata: {
          pollId: savedPoll.id,
          question: savedPoll.question,
          options: savedPoll.options?.map((o) => o.text) || [],
        },
      });
      await this.entityManager.save(MeetingEvent, newEvent);
    } catch (err) {
      console.error('Failed to log POLL_STARTED event:', err);
    }

    return savedPoll;
  }

  async findById(id: string): Promise<MeetingPoll> {
    const poll = await this.pollRepository.findById(id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return poll;
  }

  async findBySessionId(sessionId: string): Promise<MeetingPoll[]> {
    return this.pollRepository.findBySessionId(sessionId);
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

    if (!poll.options) {
      throw new BadRequestException('Poll options are not defined');
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

    if (!poll.sessionId) {
      throw new NotFoundException('Meeting session not found for this poll');
    }

    const session = await this.sessionRepository.findById(poll.sessionId);
    if (!session) {
      throw new NotFoundException('Meeting session not found');
    }

    const participant = await this.participantRepository.findByMeetingAndUser(
      session.meetingId,
      userId,
    );
    if (
      !participant ||
      (!participant.isOrganizer &&
        !participant.permissions?.includes(MeetingPermission.MANAGE_POLLS))
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage polls in this meeting',
      );
    }

    if (poll.closedAt) {
      return poll;
    }

    poll.closedAt = new Date();

    const savedPoll = await this.pollRepository.save(poll);

    // Log POLL_ENDED event
    try {
      const newEvent = this.entityManager.create(MeetingEvent, {
        sessionId: session.id,
        type: EventType.POLL_ENDED,
        triggeredByUserId: userId,
        metadata: {
          pollId: savedPoll.id,
          question: savedPoll.question,
        },
      });
      await this.entityManager.save(MeetingEvent, newEvent);
    } catch (err) {
      console.error('Failed to log POLL_ENDED event:', err);
    }

    return savedPoll;
  }
}
