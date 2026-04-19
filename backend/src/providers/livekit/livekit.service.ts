import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  Room,
  ParticipantInfo,
} from 'livekit-server-sdk';

export interface LiveKitTokenGrants {
  roomJoin: boolean;
  room: string;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  roomRecord: boolean;
}

@Injectable()
export class LiveKitService {
  private roomServiceClient: RoomServiceClient;
  private apiKey: string;
  private apiSecret: string;
  private livekitUrl: string;
  private logger = new Logger(LiveKitService.name);

  constructor(private configService: ConfigService) {
    this.apiKey = configService.get<string>('LIVEKIT_API_KEY') || '';
    this.apiSecret = configService.get<string>('LIVEKIT_API_SECRET') || '';
    this.livekitUrl = configService.get<string>('LIVEKIT_URL') || '';

    if (!this.apiKey || !this.apiSecret || !this.livekitUrl) {
      throw new BadRequestException(
        'LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL must be set',
      );
    }

    this.roomServiceClient = new RoomServiceClient(
      this.livekitUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  async generateToken(
    roomName: string,
    identity: string,
    participantName: string,
    grants: LiveKitTokenGrants,
    metadata?: string,
  ): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name: participantName,
      metadata,
      ttl: 3600,
    });

    token.addGrant({
      roomJoin: grants.roomJoin,
      room: grants.room,
      canPublish: grants.canPublish,
      canSubscribe: grants.canSubscribe,
      canPublishData: grants.canPublishData,
      roomRecord: grants.roomRecord,
    });

    return await token.toJwt();
  }

  async createRoom(roomName: string): Promise<Room> {
    return this.roomServiceClient.createRoom({
      name: roomName,
    });
  }

  async listParticipants(roomName: string): Promise<ParticipantInfo[]> {
    return this.roomServiceClient.listParticipants(roomName);
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    await this.roomServiceClient.removeParticipant(roomName, identity);
  }

  async muteParticipant(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ): Promise<void> {
    await this.roomServiceClient.mutePublishedTrack(
      roomName,
      identity,
      trackSid,
      muted,
    );
  }

  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomServiceClient.deleteRoom(roomName);
    } catch (error) {
      this.logger.warn(
        `Room ${roomName} might already be deleted: ${(error as Error).message}`,
      );
    }
  }
}
