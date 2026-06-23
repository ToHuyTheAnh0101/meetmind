import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../../meetings/entities';
import { User } from '../../users/entities/user.entity';

import { AttachmentType } from '../../../common/enums';
export { AttachmentType };

@Entity('attachments')
@Index(['meetingId'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.attachments, {
    onDelete: 'CASCADE',
  })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  uploadedByUser?: User;

  @Column('uuid')
  uploadedByUserId?: string;

  @Column({
    type: 'enum',
    enum: AttachmentType,
    default: AttachmentType.DOCUMENT,
  })
  type?: AttachmentType;

  @Column()
  fileName?: string;

  @Column()
  fileUrl?: string;

  @Column({ nullable: true })
  fileSize?: number; // in bytes

  @Column({ nullable: true })
  mimeType?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
