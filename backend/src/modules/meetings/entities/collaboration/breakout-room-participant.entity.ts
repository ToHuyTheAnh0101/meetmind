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
import { BreakoutRoom } from './breakout-room.entity';
import { User } from '../../../users/user.entity';

@Entity('breakout_room_participants')
@Index(['breakoutRoomId', 'userId'], { unique: true })
export class BreakoutRoomParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BreakoutRoom, (room) => room.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'breakout_room_id' })
  breakoutRoom: BreakoutRoom;

  @Column('uuid')
  breakoutRoomId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
