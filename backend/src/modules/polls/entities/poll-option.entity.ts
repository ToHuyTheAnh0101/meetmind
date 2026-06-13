import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MeetingPoll } from './meeting-poll.entity';
import type { PollVote } from './poll-vote.entity';

@Entity('poll-options')
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  pollId!: string;

  @ManyToOne(() => MeetingPoll, (poll) => poll.options, {
    onDelete: 'CASCADE',
  })
  poll!: MeetingPoll;

  @Column()
  text!: string;

  @OneToMany('PollVote', 'option', {
    cascade: true,
  })
  votes?: PollVote[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
