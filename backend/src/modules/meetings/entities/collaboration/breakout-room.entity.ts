import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';
import { User } from '../../../users/user.entity';
import { BreakoutRoomParticipant } from './breakout-room-participant.entity';

export enum BreakoutRoomStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('breakout_rooms')
@Index(['meetingId'])
export class BreakoutRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @Column()
  name: string;

  @Column({ unique: true })
  livekitRoomName: string;

  @Column({
    type: 'enum',
    enum: BreakoutRoomStatus,
    default: BreakoutRoomStatus.CREATED,
  })
  status: BreakoutRoomStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column('uuid')
  createdByUserId: string;

  @Column({ nullable: true })
  closedAt: Date;

  @OneToMany(
    () => BreakoutRoomParticipant,
    (participant) => participant.breakoutRoom,
    { cascade: true },
  )
  participants: BreakoutRoomParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
