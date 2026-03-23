import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Meeting, Participant } from '../meetings/entities';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  googleId: string; // Google OAuth ID

  @Column({ nullable: true })
  picture: string; // Google profile picture URL

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Meeting, (meeting) => meeting.organizer)
  organizedMeetings: Meeting[];

  @OneToMany(() => Participant, (participant) => participant.user, {
    cascade: true,
  })
  meetingParticipations: Participant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
