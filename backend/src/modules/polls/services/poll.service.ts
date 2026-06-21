import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  MeetingPoll,
  PollType,
  PollResponseDto,
} from '../entities/meeting-poll.entity';
import { PollOption } from '../entities/poll-option.entity';
import { PollVote } from '../entities/poll-vote.entity';
import { MeetingPermission } from '../../meetings/entities';
import { PollRepository } from '../repositories/poll.repository';
import { ParticipantRepository } from '../../meetings/repositories/participant.repository';
import { EntityManager, In } from 'typeorm';
import { BreakoutRoomService } from '../../breakout-rooms/services/breakout-room.service';
import { MeetLog, LogType } from '../../meetlogs/entities/meet-log.entity';

@Injectable()
export class PollService {
  constructor(
    private pollRepository: PollRepository,
    private participantRepository: ParticipantRepository,
    private entityManager: EntityManager,
    private readonly breakoutRoomService: BreakoutRoomService,
  ) {}

  private async mapPolls(
    meetingId: string,
    polls: MeetingPoll[],
  ): Promise<PollResponseDto[]>;
  private async mapPolls(
    meetingId: string,
    polls: MeetingPoll,
  ): Promise<PollResponseDto>;
  private async mapPolls(
    meetingId: string,
    polls: MeetingPoll | MeetingPoll[],
  ): Promise<PollResponseDto | PollResponseDto[]> {
    const isArray = Array.isArray(polls);
    const pollList: MeetingPoll[] = isArray ? polls : [polls];

    const participants =
      await this.participantRepository.findByMeetingId(meetingId);
    const participantMap = new Map<
      string,
      { id: string; name: string; avatarUrl?: string }
    >();

    for (const p of participants) {
      if (p.userId) {
        const name =
          p.displayName ||
          `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim() ||
          'Unknown';
        participantMap.set(p.userId, {
          id: p.userId,
          name,
          avatarUrl: p.user?.picture ?? undefined,
        });
      }
    }

    const result: PollResponseDto[] = pollList.map((poll) => {
      const rawOptions: PollOption[] = (poll.options as PollOption[]) || [];
      const sortedRawOptions = [...rawOptions].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const options = sortedRawOptions.map((opt) => {
        const votes: PollVote[] = (opt.votes as PollVote[]) || [];
        const voterIds: string[] = votes.map((v: PollVote) => v.userId);
        const voters = votes
          .map((v: PollVote) => participantMap.get(v.userId))
          .filter(
            (v): v is { id: string; name: string; avatarUrl?: string } => !!v,
          );

        return {
          id: opt.id,
          text: opt.text,
          voterIds,
          voters,
        };
      });

      return {
        id: poll.id ?? '',
        meetingId: poll.meetingId ?? '',
        createdByUserId: poll.createdByUserId ?? '',
        question: poll.question ?? '',
        type: poll.type ?? PollType.SINGLE,
        closedAt: poll.closedAt ?? null,
        createdAt: poll.createdAt ?? new Date(),
        updatedAt: poll.updatedAt ?? new Date(),
        options,
      };
    });

    return isArray ? result : result[0];
  }

  private async resolveBreakoutRoomId(
    meetingId: string,
    userId: string,
    breakoutRoomId?: string,
  ): Promise<string | undefined> {
    if (!breakoutRoomId) return undefined;
    if (breakoutRoomId === 'current') {
      return this.breakoutRoomService.getActiveRoomIdForUser(meetingId, userId);
    }
    return breakoutRoomId;
  }

  async create(
    meetingId: string,
    userId: string,
    data: Partial<MeetingPoll> & { breakoutRoomId?: string },
  ): Promise<PollResponseDto> {
    const participant = await this.participantRepository.findByMeetingAndUser(
      meetingId,
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

    const options = (data.options || []).map((opt) => {
      return this.entityManager.create(PollOption, {
        text: opt.text,
      });
    });

    const resolvedRoomId = await this.resolveBreakoutRoomId(
      meetingId,
      userId,
      data.breakoutRoomId,
    );

    const poll = this.pollRepository.create({
      question: data.question,
      type: data.type,
      meetingId,
      createdByUserId: userId,
      breakoutRoomId: resolvedRoomId || undefined,
      options,
    });

    const savedPoll = await this.pollRepository.save(poll);

    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId,
        type: LogType.POLL_STARTED,
        triggeredByUserId: userId,
        metadata: {
          pollId: savedPoll.id,
          question: savedPoll.question,
          options: savedPoll.options?.map((o) => o.text) || [],
        },
      });
      await this.entityManager.save(MeetLog, newEvent);
    } catch (err) {
      console.error('Failed to log POLL_STARTED event:', err);
    }

    return this.findById(savedPoll.id!);
  }

  async findById(id: string): Promise<PollResponseDto> {
    const poll = await this.pollRepository.findById(id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return this.mapPolls(poll.meetingId ?? '', poll);
  }

  async findByMeetingId(
    meetingId: string,
    breakoutRoomId?: string,
    userId?: string,
  ): Promise<PollResponseDto[]> {
    const resolvedRoomId = userId
      ? await this.resolveBreakoutRoomId(meetingId, userId, breakoutRoomId)
      : breakoutRoomId;

    const polls = await this.pollRepository.findByMeetingId(
      meetingId,
      resolvedRoomId,
    );
    return this.mapPolls(meetingId, polls);
  }

  async vote(
    id: string,
    userId: string,
    optionId: string,
  ): Promise<PollResponseDto> {
    const poll = await this.pollRepository.findById(id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.closedAt) {
      throw new BadRequestException('Poll is closed');
    }

    const options = poll.options || [];
    const targetOption = options.find((o) => o.id === optionId);
    if (!targetOption) {
      throw new BadRequestException('Option not found');
    }

    const PollVoteEntity = PollVote;

    if (poll.type === PollType.SINGLE || !poll.type) {
      // Single choice logic: Find if user already voted for any option in this poll
      const allOptionIds = options.map((o) => o.id);

      const existingVote = await this.entityManager.findOne(PollVoteEntity, {
        where: {
          userId,
          optionId: In(allOptionIds),
        },
      });

      if (existingVote) {
        if (existingVote.optionId === optionId) {
          // Un-vote
          await this.entityManager.remove(PollVoteEntity, existingVote);
        } else {
          // Switch vote
          await this.entityManager.remove(PollVoteEntity, existingVote);
          const newVote = this.entityManager.create(PollVoteEntity, {
            optionId,
            userId,
          });
          await this.entityManager.save(PollVoteEntity, newVote);
        }
      } else {
        // Vote
        const newVote = this.entityManager.create(PollVoteEntity, {
          optionId,
          userId,
        });
        await this.entityManager.save(PollVoteEntity, newVote);
      }
    } else {
      // Multiple choice logic (Toggle)
      const existingVote = await this.entityManager.findOne(PollVoteEntity, {
        where: {
          userId,
          optionId,
        },
      });

      if (existingVote) {
        await this.entityManager.remove(PollVoteEntity, existingVote);
      } else {
        const newVote = this.entityManager.create(PollVoteEntity, {
          optionId,
          userId,
        });
        await this.entityManager.save(PollVoteEntity, newVote);
      }
    }

    return this.findById(id);
  }

  async close(id: string, userId: string): Promise<PollResponseDto> {
    const poll = await this.pollRepository.findById(id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (!poll.meetingId) {
      throw new NotFoundException('Meeting room not found for this poll');
    }

    const participant = await this.participantRepository.findByMeetingAndUser(
      poll.meetingId,
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
      return this.findById(id);
    }

    poll.closedAt = new Date();
    const savedPoll = await this.pollRepository.save(poll);

    // Log POLL_ENDED event
    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId: poll.meetingId,
        type: LogType.POLL_ENDED,
        triggeredByUserId: userId,
        metadata: {
          pollId: savedPoll.id,
          question: savedPoll.question,
        },
      });
      await this.entityManager.save(MeetLog, newEvent);
    } catch (err) {
      console.error('Failed to log POLL_ENDED event:', err);
    }

    return this.findById(id);
  }
}
