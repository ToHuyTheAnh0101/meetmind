import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';
import { User } from '../../../users/user.entity';

export enum PollType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

@Entity('meeting-polls')
@Index(['meetingId'])
export class MeetingPoll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.polls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column('uuid')
  createdByUserId: string;

  @Column()
  question: string;

  @Column({ type: 'enum', enum: PollType, default: PollType.SINGLE })
  type: PollType;

  @Column({ type: 'jsonb' })
  options: Array<{ id: string; text: string; voterIds: string[] }>;

  @Column({ nullable: true })
  offsetSeconds: number;

  @Column({ nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
