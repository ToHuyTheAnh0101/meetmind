import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';

export enum SummaryTemplatePurpose {
  INTERVIEW = 'interview',
  REPORT = 'report',
  PROJECT_DISCUSSION = 'project_discussion',
  TEAM_MEETING = 'team_meeting',
  CUSTOM = 'custom',
}

export interface TemplateSectionDef {
  name: string; // machine key e.g. "candidate_info"
  label: string; // display label e.g. "Candidate Information"
  description?: string; // placeholder hint for the user
  order: number;
}

@Entity('summary_templates')
export class SummaryTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: SummaryTemplatePurpose })
  purpose: SummaryTemplatePurpose;

  @Column({ type: 'jsonb' })
  sections: TemplateSectionDef[];

  @Column({ default: false })
  isSystem: boolean; // true = predefined by platform

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column('uuid', { nullable: true })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
