import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Participant } from './participant.entity';
import { MeetingEvent } from '../collaboration/meeting-event.entity';
import { MeetingQuestion } from '../collaboration/meeting-question.entity';
import { MeetingPoll } from '../collaboration/meeting-poll.entity';
import { Summary } from '../content/summary.entity';
import { Attachment } from '../content/attachment.entity';
import { Notification } from '../scheduling/notification.entity';
import { BreakoutRoom } from '../collaboration/breakout-room.entity';
import { AccessRequest } from '../scheduling/access-request.entity';
import { ChatHistory } from '../ai/chat-history.entity';
import { SummaryTemplate } from '../content/summary-template.entity';
import { TranscriptChunk } from '../content/transcript-chunk.entity';

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

  @Column('jsonb', { default: [] })
  inviteeEmails: string[];

  @Column({ default: 10 })
  reminderMinutes: number;

  @Column()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ nullable: true })
  recordingUrl: string;

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

  @OneToMany(() => MeetingEvent, (event) => event.meeting, {
    cascade: true,
  })
  events: MeetingEvent[];

  @OneToMany(() => MeetingQuestion, (question) => question.meeting, {
    cascade: true,
  })
  qaQuestions: MeetingQuestion[];

  @OneToMany(() => MeetingPoll, (poll) => poll.meeting, {
    cascade: true,
  })
  polls: MeetingPoll[];

  @ManyToOne(() => SummaryTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: SummaryTemplate;

  @Column('uuid', { nullable: true })
  templateId: string;

  @OneToOne(() => Summary, (summary) => summary.meeting, {
    cascade: true,
  })
  summary: Summary;

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
