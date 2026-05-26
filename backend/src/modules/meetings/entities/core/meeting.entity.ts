import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Participant } from './participant.entity';
import { Attachment } from '../../../attachments/entities/attachment.entity';
import { Notification } from '../scheduling/notification.entity';
import { BreakoutRoom } from '../../../breakout-rooms/entities/breakout-room.entity';
import { AccessRequest } from '../scheduling/access-request.entity';
import { ChatHistory } from '../ai/chat-history.entity';
import { SummaryTemplate } from '../../../summaries/entities/summary-template.entity';
import { TranscriptChunk } from '../content/transcript-chunk.entity';
import { MeetingSession } from './meeting-session.entity';

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING_COMPLETION = 'pending_completion',
}

export enum MeetingAccessType {
  PUBLIC = 'public',
  INVITE_ONLY = 'invite_only',
}

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  @Column({
    type: 'enum',
    enum: MeetingAccessType,
    default: MeetingAccessType.PUBLIC,
  })
  accessType: MeetingAccessType;

  @Column({ default: false })
  waitingRoomEnabled: boolean;

  @Column({ default: false })
  muteOnJoin: boolean;

  @Column({ default: true })
  allowDisplayNameEdit: boolean;

  @Column({ default: true })
  isQaEnabled: boolean;

  @Column({ default: true })
  isAnonymousAllowed: boolean;

  @Column('jsonb', { default: [] })
  inviteeEmails: string[];

  @Column({ default: 10 })
  reminderMinutes: number;

  @Column()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @ManyToOne(() => User, (user) => user.organizedMeetings)
  organizer: User;

  @Column('uuid')
  organizerId: string;

  @OneToMany(() => TranscriptChunk, (chunk) => chunk.meeting, {
    nullable: true,
  })
  transcriptChunks: TranscriptChunk[];

  @OneToMany(() => Participant, (participant) => participant.meeting, {
    cascade: true,
  })
  participants: Participant[];

  @ManyToOne(() => SummaryTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: SummaryTemplate;

  @Column('uuid', { nullable: true })
  templateId: string;

  @OneToMany(() => MeetingSession, (session) => session.meeting, {
    cascade: true,
  })
  sessions: MeetingSession[];

  @OneToMany(() => Attachment, (attachment) => attachment.meeting, {
    cascade: true,
  })
  attachments: Attachment[];

  @OneToMany(() => Notification, (notification) => notification.meeting, {
    cascade: true,
  })
  notifications: Notification[];

  @OneToMany(() => BreakoutRoom, (room) => room.meeting, {
    cascade: true,
  })
  breakoutRooms: BreakoutRoom[];

  @OneToMany(() => AccessRequest, (accessRequest) => accessRequest.meeting, {
    cascade: true,
  })
  accessRequests: AccessRequest[];

  @OneToMany(() => ChatHistory, (chatHistory) => chatHistory.meeting, {
    cascade: true,
  })
  aiChatHistories: ChatHistory[];

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  livekitRoomName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
