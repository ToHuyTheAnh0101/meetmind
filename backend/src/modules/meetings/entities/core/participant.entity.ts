import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Meeting } from './meeting.entity';

import { MeetingPermission, ParticipantStatus } from '../../../../common/enums';
export { MeetingPermission, ParticipantStatus };

@Entity('participants')
@Unique(['meetingId', 'userId'])
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.participants, {
    onDelete: 'CASCADE',
  })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @ManyToOne(() => User, (user) => user.meetingParticipations, {
    onDelete: 'CASCADE',
  })
  user?: User;

  @Column('uuid')
  userId?: string;

  @Column('jsonb', { default: [] })
  permissions?: MeetingPermission[];

  @Column({ default: false })
  isOrganizer?: boolean;

  @Column({ default: false })
  isInMeeting?: boolean;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.ADMITTED,
  })
  status?: ParticipantStatus;

  @Column({ nullable: true })
  displayName?: string;

  @UpdateDateColumn()
  updatedAt?: Date;
}
