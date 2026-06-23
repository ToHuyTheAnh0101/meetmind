import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Meeting } from '../../meetings/entities';
import { User } from '../../users/entities/user.entity';
import { BreakoutRoomParticipant } from './breakout-room-participant.entity';

import { BreakoutRoomStatus } from '../../../common/enums';
export { BreakoutRoomStatus };

@Entity('breakout_rooms')
@Index(['meetingId'])
export class BreakoutRoom {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @Column()
  name?: string;

  @Column({ unique: true })
  livekitRoomName?: string;

  @Column({
    type: 'enum',
    enum: BreakoutRoomStatus,
    default: BreakoutRoomStatus.CREATED,
  })
  status?: BreakoutRoomStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdByUser?: User;

  @Column('uuid')
  createdByUserId?: string;

  @Column({ nullable: true })
  closedAt?: Date;

  @OneToMany(
    () => BreakoutRoomParticipant,
    (participant) => participant.breakoutRoom,
    { cascade: true },
  )
  participants?: BreakoutRoomParticipant[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
