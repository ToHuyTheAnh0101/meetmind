import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Meeting } from './meeting.entity';

export enum MeetingPermission {
  EDIT_SUMMARY = 'edit_summary',
  CHAT_WITH_AI = 'chat_with_ai',
  UPDATE_PERMISSIONS = 'update_permissions',
  VIEW_TRANSCRIPT = 'view_transcript',
  DOWNLOAD_RECORDING = 'download_recording',
  EDIT_MEETING_INFO = 'edit_meeting_info',
}

export enum ParticipantStatus {
  ADMITTED = 'admitted',
  WAITING = 'waiting',
  DENIED = 'denied',
}

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.participants, {
    onDelete: 'CASCADE',
  })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @ManyToOne(() => User, (user) => user.meetingParticipations, {
    onDelete: 'CASCADE',
  })
  user: User;

  @Column('uuid')
  userId: string;

  @Column('jsonb', { default: [] })
  permissions: MeetingPermission[];

  @Column({ default: false })
  isOrganizer: boolean;

  @Column({ default: false })
  isInMeeting: boolean;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.ADMITTED,
  })
  status: ParticipantStatus;

  @UpdateDateColumn()
  updatedAt: Date;
}
