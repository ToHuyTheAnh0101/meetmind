import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';

@Entity('screen_captures')
@Index(['meetingId'])
export class ScreenCapture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  meetingId!: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting!: Meeting;

  @Column()
  imageUrl!: string;

  @Column('float')
  timestamp!: number; // seconds into meeting

  /**
   * Tóm tắt nội dung slide/màn hình được phân tích bởi Gemini Vision.
   * - Có giá trị (string): ảnh có ý nghĩa, dùng làm visual context trong RAG.
   * - null: ảnh rác (desktop trống, camera, màn hình chờ) — bỏ qua trong RAG.
   */
  @Column('text', { nullable: true })
  summary!: string | null;

  /**
   * Vector embedding 1024 chiều tạo từ summary.
   * Phục vụ semantic vector search trong RAG pipeline.
   * null khi summary chưa được tạo hoặc ảnh là ảnh rác.
   */
  @Column('vector', { length: 1024, nullable: true })
  embedding!: number[] | null;

  @CreateDateColumn()
  createdAt!: Date;
}
