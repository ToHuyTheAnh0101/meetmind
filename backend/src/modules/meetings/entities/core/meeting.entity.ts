import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Participant } from './participant.entity';
import { Attachment } from '../../../attachments/entities/attachment.entity';
import { BreakoutRoom } from '../../../breakout-rooms/entities/breakout-room.entity';
import { ChatHistory } from '../../../summaries/entities/chat-history.entity';
import { SummaryTemplate } from '../../../summaries/entities/summary-template.entity';
import { TranscriptChunk } from '../content/transcript-chunk.entity';

import { MeetingStatus, MeetingAccessType } from '../../../../common/enums';
export { MeetingStatus, MeetingAccessType };

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column()
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status?: MeetingStatus;

  @Column({
    type: 'enum',
    enum: MeetingAccessType,
    default: MeetingAccessType.PUBLIC,
  })
  accessType?: MeetingAccessType;

  @Column({ default: false })
  waitingRoomEnabled?: boolean;

  @Column({ default: false })
  muteOnJoin?: boolean;

  @Column({ default: true })
  allowDisplayNameEdit?: boolean;

  @Column({ default: true })
  isQaEnabled?: boolean;

  @Column('jsonb', { default: [] })
  inviteeEmails?: string[];

  @Column({ default: 10 })
  reminderMinutes?: number;

  @Column({ type: 'timestamptz', nullable: true })
  startTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualStartTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualEndTime?: Date;

  @Column({ type: 'boolean', default: false })
  aiActivated?: boolean;

  @Column('jsonb', { default: [] })
  sharedEmails?: string[];

  @ManyToOne(() => User, (user) => user.organizedMeetings)
  organizer?: User;

  @Column('uuid')
  organizerId?: string;

  @OneToMany(() => TranscriptChunk, (chunk) => chunk.meeting, {
    nullable: true,
  })
  transcriptChunks?: TranscriptChunk[];

  @OneToMany(() => Participant, (participant) => participant.meeting, {
    cascade: true,
  })
  participants?: Participant[];

  @ManyToOne(() => SummaryTemplate, { nullable: true, onDelete: 'SET NULL' })
  template?: SummaryTemplate;

  @Column('uuid', { nullable: true })
  templateId?: string;

  @OneToMany(() => Attachment, (attachment) => attachment.meeting, {
    cascade: true,
  })
  attachments?: Attachment[];

  @OneToMany(() => BreakoutRoom, (room) => room.meeting, {
    cascade: true,
  })
  breakoutRooms?: BreakoutRoom[];

  @OneToMany(() => ChatHistory, (chatHistory) => chatHistory.meeting, {
    cascade: true,
  })
  aiChatHistories?: ChatHistory[];

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  livekitRoomName: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
