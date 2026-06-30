import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Participant } from '../../meetings/entities';
import { User } from '../../users/entities/user.entity';
import { MeetingAnswer } from './meeting-answer.entity';

@Entity('meeting-questions')
@Index(['meetingId'])
export class MeetingQuestion {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'uuid', nullable: true })
  meetingId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  askedByUser?: User;

  @Column({ type: 'uuid', nullable: true })
  askedByUserId?: string;

  @ManyToOne(() => Participant)
  @JoinColumn([
    { name: 'meetingId', referencedColumnName: 'meetingId' },
    { name: 'askedByUserId', referencedColumnName: 'userId' },
  ])
  askedByParticipant?: Participant;

  @Column()
  content?: string;

  @OneToMany(() => MeetingAnswer, (answer) => answer.question)
  answers?: MeetingAnswer[];

  @Column({ type: 'uuid', nullable: true })
  @Index()
  breakoutRoomId?: string;

  @Column({ default: false })
  revealAnswers?: boolean;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
