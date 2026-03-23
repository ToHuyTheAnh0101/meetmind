import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';

@Entity('summaries')
@Index(['meetingId'])
export class Summary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Meeting, (meeting) => meeting.summary, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @Column({ type: 'text', nullable: true })
  summaryText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
