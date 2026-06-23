import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

import { SummaryTemplatePurpose } from '../../../common/enums';
export { SummaryTemplatePurpose };

export interface TemplateSectionDef {
  name?: string; // machine key e.g. "candidate_info"
  label?: string; // display label e.g. "Candidate Information"
  description?: string; // placeholder hint for the user
  blockType?: string; // 'executive_summary' | 'action_items' | 'decisions' | 'todo_table' | 'custom'
  aiInstructions?: string; // Custom block-level AI instruction
  placeholders?: string; // Bullet/markup rules or template with variables
  order?: number;
}

@Entity('summary_templates')
export class SummaryTemplate {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column()
  name?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: SummaryTemplatePurpose })
  purpose?: SummaryTemplatePurpose;

  @Column({ type: 'jsonb' })
  sections?: TemplateSectionDef[];

  @Column({ type: 'varchar', nullable: true, default: 'detailed' })
  summaryStyle?: string;

  @Column({ type: 'text', nullable: true })
  globalRules?: string;

  @Column({ default: false })
  isSystem?: boolean; // true = predefined by platform

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  createdByUser?: User;

  @Column('uuid', { nullable: true })
  createdByUserId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
