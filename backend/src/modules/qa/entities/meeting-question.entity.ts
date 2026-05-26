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
import { Participant, MeetingSession } from '../../meetings/entities';
import { User } from '../../users/user.entity';
import { MeetingAnswer } from './meeting-answer.entity';

export enum QuestionType {
  HOST_QA = 'host_qa', // Người điều hành hỏi khán giả
  AUDIENCE_QA = 'audience_qa', // Khán giả hỏi người điều hành (Q&A)
}

export enum QuestionStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  DISMISSED = 'dismissed',
}

@Entity('meeting-questions')
@Index(['sessionId'])
export class MeetingQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: MeetingSession;

  @Column({ name: 'meeting_id', type: 'uuid', nullable: true })
  meetingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asked_by_user_id' })
  askedByUser: User;

  @Column({ name: 'asked_by_user_id', type: 'uuid', nullable: true })
  askedByUserId: string;

  @ManyToOne(() => Participant)
  @JoinColumn([
    { name: 'meeting_id', referencedColumnName: 'meetingId' },
    { name: 'asked_by_user_id', referencedColumnName: 'userId' },
  ])
  askedByParticipant: Participant;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({
    type: 'enum',
    enum: QuestionStatus,
    default: QuestionStatus.PENDING,
  })
  status: QuestionStatus;

  @Column({ nullable: true })
  offsetSeconds: number;

  @OneToMany(() => MeetingAnswer, (answer) => answer.question)
  answers: MeetingAnswer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
