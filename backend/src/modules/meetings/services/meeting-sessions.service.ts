import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MeetingSessionRepository } from '../repositories/meeting-session.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
import { TranscriptRepository } from '../repositories/transcript.repository';
import {
  MeetingSession,
  MeetingSessionStatus,
  MeetingSessionShare,
  MeetingPermission,
} from '../entities';
import { MeetingSessionShareRepository } from '../repositories/meeting-session-share.repository';
import { ParticipantRepository } from '../repositories/participant.repository';
import { EntityManager } from 'typeorm';
import {
  MeetingEvent,
  EventType,
} from '../../events/entities/meeting-event.entity';

@Injectable()
export class MeetingSessionsService {
  constructor(
    private readonly sessionRepository: MeetingSessionRepository,
    private readonly meetingsRepository: MeetingRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly sessionShareRepository: MeetingSessionShareRepository,
    private readonly participantsRepository: ParticipantRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly entityManager: EntityManager,
  ) {}

  // start a session
  async startSession(
    meetingId: string,
    userId: string,
  ): Promise<MeetingSession> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    // Only organizer can start session/record by default
    if (meeting.organizerId !== userId) {
      throw new Error('Only organizer can start session');
    }

    let active = await this.sessionRepository.findActiveByMeeting(meetingId);
    if (!active) {
      // Fallback just in case (should not happen normally since joinMeeting creates it)
      active = this.sessionRepository.create({
        meetingId,
        actualStartTime: new Date(),
        status: MeetingSessionStatus.ONGOING,
        aiActivated: true,
      });
      active = await this.sessionRepository.save(active);
    } else if (!active.aiActivated) {
      active.aiActivated = true;
      await this.sessionRepository.save(active);
    }

    // Log AI assistant activated event
    const newEvent = this.entityManager.create(MeetingEvent, {
      sessionId: active.id,
      type: EventType.AI_ASSISTANT_ACTIVATED,
      triggeredByUserId: userId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
    await this.entityManager.save(MeetingEvent, newEvent);

    return active;
  }

  async endSession(
    meetingId: string,
    sessionId: string,
    userId: string,
  ): Promise<MeetingSession> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    if (meeting.organizerId !== userId) {
      throw new Error('Only organizer can end session');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    session.actualEndTime = new Date();
    session.status = MeetingSessionStatus.COMPLETED;

    const saved = await this.sessionRepository.save(session);

    // Log AI assistant deactivated event
    const newEvent = this.entityManager.create(MeetingEvent, {
      sessionId: saved.id,
      type: EventType.AI_ASSISTANT_DEACTIVATED,
      triggeredByUserId: userId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
    await this.entityManager.save(MeetingEvent, newEvent);

    // Clear cache when session ends
    const cacheKey = `session:${meetingId}`;
    await this.cacheManager.del(cacheKey);

    return saved;
  }

  /**
   * Ensure session exists for a meeting, auto-create if not
   * Uses cache to avoid repeated DB queries
   */
  async ensureSessionForMeeting(meetingId: string): Promise<MeetingSession> {
    const cacheKey = `session:${meetingId}`;

    // Check cache first
    const cachedSession = await this.cacheManager.get<MeetingSession>(cacheKey);
    if (cachedSession) {
      return cachedSession;
    }

    // Query DB for active session
    let session = await this.sessionRepository.findActiveByMeeting(meetingId);
    if (!session) {
      // Auto-create session if none exists
      const meeting = await this.meetingsRepository.findById(meetingId);
      if (!meeting) throw new NotFoundException('Meeting not found');
      // Auto-start session
      session = this.sessionRepository.create({
        meetingId,
        actualStartTime: new Date(),
        status: MeetingSessionStatus.ONGOING,
      });
      session = await this.sessionRepository.save(session);
    }

    // Cache the session
    await this.cacheManager.set(cacheKey, session, 0);
    return session;
  }

  async findActiveByMeeting(meetingId: string): Promise<MeetingSession | null> {
    return this.sessionRepository.findActiveByMeeting(meetingId);
  }

  async getSessionsByMeetingId(meetingId: string): Promise<any[]> {
    const sessions = await this.sessionRepository.findByMeetingId(meetingId);
    const result: any[] = [];
    for (const session of sessions) {
      const chunks = await this.transcriptRepository.findBySessionId(
        session.id,
      );
      result.push({
        ...session,
        hasTranscripts: chunks.length > 0,
      });
    }
    return result;
  }

  async save(session: Partial<MeetingSession>): Promise<MeetingSession> {
    return this.sessionRepository.save(session);
  }

  async isOrganizerOrCoHost(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) return false;
    if (meeting.organizerId === userId) return true;

    const p = await this.participantsRepository.findByMeetingAndUser(
      meetingId,
      userId,
    );
    return !!(
      p?.isOrganizer || p?.permissions?.includes(MeetingPermission.CO_HOST)
    );
  }

  async checkSessionAccess(
    sessionId: string,
    userId: string,
    userEmail: string,
  ): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) return false;

    const meeting = await this.meetingsRepository.findById(session.meetingId);
    if (!meeting) return false;

    // 1. Organizer always has access
    if (meeting.organizerId === userId) return true;

    // 2. Co-host always has access
    const requesterParticipant =
      await this.participantsRepository.findByMeetingAndUser(
        meeting.id,
        userId,
      );
    if (
      requesterParticipant &&
      (requesterParticipant.isOrganizer ||
        requesterParticipant.permissions.includes(MeetingPermission.CO_HOST))
    ) {
      return true;
    }

    // 3. Merged allowed emails
    const normalizedEmail = userEmail.trim().toLowerCase();

    // a. Initiated invite emails
    const invitees = (meeting.inviteeEmails || []).map((e) =>
      e.trim().toLowerCase(),
    );
    if (invitees.includes(normalizedEmail)) return true;

    // b. Organizer email
    if (
      meeting.organizer &&
      meeting.organizer.email.trim().toLowerCase() === normalizedEmail
    ) {
      return true;
    }

    // c. Actual meeting participants' emails
    const participants = await this.participantsRepository.findByMeetingId(
      meeting.id,
    );
    for (const p of participants) {
      if (p.user && p.user.email.trim().toLowerCase() === normalizedEmail) {
        return true;
      }
    }

    // d. Explicitly shared via MeetingSessionShare
    const isShared = await this.sessionShareRepository.existsBySessionAndEmail(
      sessionId,
      normalizedEmail,
    );
    if (isShared) return true;

    return false;
  }

  async getSessionShares(meetingId: string, sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const meeting = await this.meetingsRepository.findById(session.meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    // a. Organizer email
    const organizerEmail = meeting.organizer ? meeting.organizer.email : null;

    // b. Invite list
    const invitees = meeting.inviteeEmails || [];

    // c. Participants in this meeting
    const participants = await this.participantsRepository.findByMeetingId(
      meeting.id,
    );
    const participantEmails = participants
      .map((p) => p.user?.email)
      .filter((email): email is string => !!email);

    // Merged default allowed emails
    const defaultEmailsSet = new Set<string>();
    if (organizerEmail) defaultEmailsSet.add(organizerEmail);
    invitees.forEach((e) => defaultEmailsSet.add(e));
    participantEmails.forEach((e) => defaultEmailsSet.add(e));

    const defaultEmails = Array.from(defaultEmailsSet);

    // d. Explicitly shared
    const sharedShares =
      await this.sessionShareRepository.findBySessionId(sessionId);

    return {
      defaultEmails,
      sharedShares,
    };
  }

  async addSessionShare(
    sessionId: string,
    email: string,
  ): Promise<MeetingSessionShare> {
    const trimmedEmail = email.trim().toLowerCase();
    const isAlreadyShared =
      await this.sessionShareRepository.existsBySessionAndEmail(
        sessionId,
        trimmedEmail,
      );
    if (isAlreadyShared) {
      throw new Error('Email is already shared for this session');
    }

    const share = this.sessionShareRepository.create({
      sessionId,
      email: trimmedEmail,
    });
    return this.sessionShareRepository.save(share);
  }

  async removeSessionShare(shareId: string): Promise<void> {
    const share = await this.sessionShareRepository.findById(shareId);
    if (!share) throw new NotFoundException('Share record not found');
    await this.sessionShareRepository.remove(share);
  }
}
