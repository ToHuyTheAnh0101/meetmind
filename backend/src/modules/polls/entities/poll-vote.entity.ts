import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { PollOption } from './poll-option.entity';
import { User } from '../../users/entities/user.entity';

@Entity('poll-votes')
export class PollVote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  optionId!: string;

  @ManyToOne(() => PollOption, (option) => option.votes, {
    onDelete: 'CASCADE',
  })
  option!: PollOption;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
