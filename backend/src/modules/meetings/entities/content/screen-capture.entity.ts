import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';

@Entity('screen_captures')
@Index(['meetingId'])
export class ScreenCapture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  meetingId!: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting!: Meeting;

  @Column()
  imageUrl!: string;

  @Column('float')
  timestamp!: number; // seconds into meeting

  @CreateDateColumn()
  createdAt!: Date;
}
