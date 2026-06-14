import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { MeetingsService } from './meetings.service';
import { ParticipantsService } from './participants.service';
import { ParticipantRepository } from '../repositories/participant.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
import { ParticipantStatus } from '../entities';

interface LiveKitWebhookEvent {
  event?: string;
  room?: {
    name?: string;
  };
  participant?: {
    identity?: string;
  };
  egressInfo?: {
    roomName?: string;
    participantIdentity?: string;
    fileResults?: Array<{
      location?: string;
      size?: number;
      duration?: number;
    }>;
    startedAt?: number;
  };
}

@Injectable()
export class MeetingsWebhookService {
  private readonly logger = new Logger(MeetingsWebhookService.name);

  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly meetingsService: MeetingsService,
    private readonly participantsService: ParticipantsService,
    private readonly participantRepository: ParticipantRepository,
    private readonly meetingRepository: MeetingRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async handleWebhook(
    payload: string,
    authHeader: string,
  ): Promise<{ status: string }> {
    try {
      const event = (await this.liveKitService.receiveWebhook(
        payload,
        authHeader,
      )) as unknown as LiveKitWebhookEvent;

      const eventName = event.event;
      this.logger.debug(`Received LiveKit webhook event: ${eventName}`);

      switch (eventName) {
        case 'participant_joined':
          await this.handleParticipantJoined(event);
          break;
        case 'participant_left':
          await this.handleParticipantLeft(event);
          break;
        case 'egress_ended':
          await this.handleEgressEnded(event);
          break;
        default:
          this.logger.debug(`Unhandled LiveKit webhook event: ${eventName}`);
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error handling LiveKit webhook:', error);
      throw error;
    }
  }

  private getMeetingIdFromRoom(roomName: string): string | null {
    if (roomName.startsWith('breakout-')) {
      const match = roomName.match(/^breakout-(.+)-\d+-\d+$/);
      if (match) {
        return match[1];
      }
    }
    return roomName; // For main rooms, the roomName is exactly the meetingId (UUID)
  }

  private async handleParticipantJoined(
    event: LiveKitWebhookEvent,
  ): Promise<void> {
    const roomName = event.room?.name;
    const userId = event.participant?.identity;

    if (!roomName || !userId) {
      this.logger.warn(
        'Invalid participant_joined event payload: missing roomName or userId',
      );
      return;
    }

    const meetingId = this.getMeetingIdFromRoom(roomName);
    if (!meetingId) return;

    this.logger.log(
      `Participant ${userId} joined room ${roomName} in meeting ${meetingId}`,
    );

    // Update cached active room for participant
    const cacheKey = `active_room:${meetingId}:${userId}`;
    await this.cacheManager.set(cacheKey, roomName, 86400000); // cache for 1 day

    // Clear transitioning flag since transition completed successfully
    const transitionKey = `transitioning:${meetingId}:${userId}`;
    await this.cacheManager.del(transitionKey);

    // Mark participant as in meeting in the DB
    const participant = await this.participantRepository.findByMeetingAndUser(
      meetingId,
      userId,
    );
    if (participant) {
      participant.isInMeeting = true;
      participant.status = ParticipantStatus.ADMITTED;
      await this.participantRepository.save(participant);
    }
  }

  private async handleParticipantLeft(
    event: LiveKitWebhookEvent,
  ): Promise<void> {
    const roomName = event.room?.name;
    const userId = event.participant?.identity;

    if (!roomName || !userId) {
      this.logger.warn(
        'Invalid participant_left event payload: missing roomName or userId',
      );
      return;
    }

    const meetingId = this.getMeetingIdFromRoom(roomName);
    if (!meetingId) return;

    this.logger.log(
      `Participant ${userId} left room ${roomName} in meeting ${meetingId}`,
    );

    try {
      // Check if user is currently transitioning between rooms
      const transitionKey = `transitioning:${meetingId}:${userId}`;
      const isTransitioning =
        await this.cacheManager.get<boolean>(transitionKey);

      if (isTransitioning) {
        this.logger.log(
          `Participant ${userId} is transitioning from ${roomName}. Ignoring offline trigger.`,
        );
        return;
      }

      // If not transitioning, they are actually leaving the meeting.
      this.logger.log(
        `Participant ${userId} left the meeting entirely from room ${roomName}.`,
      );
      const cacheKey = `active_room:${meetingId}:${userId}`;
      await this.cacheManager.del(cacheKey);
      await this.participantsService.leaveMeeting(meetingId, userId);
    } catch (err) {
      this.logger.error(
        `Error in participant_left processing for user ${userId}:`,
        err,
      );
    }
  }

  private async handleEgressEnded(event: LiveKitWebhookEvent): Promise<void> {
    const egressInfo = event.egressInfo;
    if (egressInfo) {
      const fileResults = egressInfo.fileResults;
      if (Array.isArray(fileResults) && fileResults.length > 0) {
        const meetingId = String(egressInfo.roomName || '');
        const fileResult = fileResults[0];
        const participantIdentity = String(
          egressInfo.participantIdentity || '',
        );

        const location = String(fileResult.location || '');
        const size = Number(fileResult.size || 0);
        const duration = Number(fileResult.duration || 0) / 1000000000;
        const startedAt = egressInfo.startedAt
          ? Number(egressInfo.startedAt) / 1000000000
          : 0;

        await this.meetingsService.saveAudioRecording(
          meetingId,
          participantIdentity,
          location,
          size,
          duration,
          startedAt,
        );

        this.logger.log(
          `LiveKit Egress Ended for room ${meetingId}. Audio saved at: ${location}`,
        );
      }
    }
  }
}
