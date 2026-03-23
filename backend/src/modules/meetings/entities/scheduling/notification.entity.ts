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

@Entity('notifications')
@Index(['meetingId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @Column({ type: 'jsonb', default: [] })
  recipientUserIds: string[];

  @Column({ nullable: true })
  sentTime: Date;

  @Column()
  title: string;

  @Column('text')
  content: string; 

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
