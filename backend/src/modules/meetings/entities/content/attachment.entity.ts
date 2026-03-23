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
import { User } from '../../../users/user.entity';

export enum AttachmentType {
  DOCUMENT = 'document',
  AUDIO = 'audio',
  LINK = 'link',
  VIDEO = 'video',
  IMAGE = 'image',
  OTHER = 'other',
}

@Entity('attachments')
@Index(['meetingId'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser: User;

  @Column('uuid')
  uploadedByUserId: string;

  @Column({
    type: 'enum',
    enum: AttachmentType,
    default: AttachmentType.DOCUMENT,
  })
  type: AttachmentType;

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  fileSize: number; // in bytes

  @Column({ nullable: true })
  mimeType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
