import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { BreakoutRoom } from './breakout-room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('breakout_room_participants')
@Index(['breakoutRoomId', 'userId'], { unique: true })
export class BreakoutRoomParticipant {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => BreakoutRoom, (room) => room.participants, {
    onDelete: 'CASCADE',
  })
  breakoutRoom?: BreakoutRoom;

  @Column({ type: 'uuid', nullable: true })
  breakoutRoomId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
