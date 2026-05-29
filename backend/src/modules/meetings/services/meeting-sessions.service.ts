import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MeetingSessionRepository } from '../repositories/meeting-session.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
import { TranscriptRepository } from '../repositories/transcript.repository';
import { MeetingSession, MeetingSessionStatus } from '../entities';

@Injectable()
export class MeetingSessionsService {
  constructor(
    private readonly sessionRepository: MeetingSessionRepository,
    private readonly meetingsRepository: MeetingRepository,
    private readonly transcriptRepository: TranscriptRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

    // If an active session exists, return it
    const active = await this.sessionRepository.findActiveByMeeting(meetingId);
    if (active) return active;

    const session = this.sessionRepository.create({
      meetingId,
      actualStartTime: new Date(),
      status: MeetingSessionStatus.ONGOING,
    });

    return this.sessionRepository.save(session);
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
}
