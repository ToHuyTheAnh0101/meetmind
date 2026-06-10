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

@Entity('summaries')
@Index(['meetingId'])
export class Summary {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  meeting?: Meeting;

  @Column('uuid', { nullable: true })
  meetingId?: string;

  @Column({ type: 'text', nullable: true })
  summaryText?: string;

  @Column('uuid', { nullable: true })
  templateId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
