import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Meeting } from '../../meetings/entities';
import { User } from '../../users/user.entity';
import { PollOption } from './poll-option.entity';

export enum PollType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export interface PollVoterDto {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface PollOptionResponseDto {
  id: string;
  text: string;
  voterIds: string[];
  voters: PollVoterDto[];
}

export interface PollResponseDto {
  id: string;
  meetingId: string;
  createdByUserId: string;
  question: string;
  type: PollType;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  options: PollOptionResponseDto[];
}

@Entity('meeting-polls')
@Index(['meetingId'])
export class MeetingPoll {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, {
    onDelete: 'CASCADE',
  })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdByUser?: User;

  @Column('uuid')
  createdByUserId?: string;

  @Column()
  question?: string;

  @Column({ type: 'enum', enum: PollType, default: PollType.SINGLE })
  type?: PollType;

  @OneToMany(() => PollOption, (option) => option.poll, {
    cascade: true,
  })
  options?: PollOption[];

  @Column({ nullable: true })
  closedAt?: Date;

  @Column('uuid', { nullable: true })
  @Index()
  breakoutRoomId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
