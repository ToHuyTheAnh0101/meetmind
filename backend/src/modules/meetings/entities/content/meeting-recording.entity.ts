import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';
import { Participant } from '../core/participant.entity';

@Entity('meeting_recordings')
@Index(['meetingId'])
export class MeetingRecording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;

  @Column('uuid', { nullable: true })
  participantId: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ default: 'audio/webm' })
  mimeType: string;

  @Column('float', { nullable: true })
  startTime: number; // Giây thứ mấy trong cuộc họp

  @Column('float', { nullable: true })
  duration: number; // Độ dài đoạn ghi âm

  @CreateDateColumn()
  createdAt: Date;
}
