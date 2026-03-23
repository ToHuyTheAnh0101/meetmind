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
import { Meeting } from '../core/meeting.entity';
import { User } from '../../../users/user.entity';
import { MeetingAnswer } from './meeting-answer.entity';

export enum QuestionType {
  HOST_QA = 'host_qa', // Người điều hành hỏi khán giả
  AUDIENCE_QA = 'audience_qa', // Khán giả hỏi người điều hành (Q&A)
}

@Entity('meeting-questions')
@Index(['meetingId'])
export class MeetingQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.qaQuestions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asked_by_user_id' })
  askedByUser: User;

  @Column('uuid')
  askedByUserId: string;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ nullable: true })
  offsetSeconds: number;

  @OneToMany(() => MeetingAnswer, (answer) => answer.question)
  answers: MeetingAnswer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
