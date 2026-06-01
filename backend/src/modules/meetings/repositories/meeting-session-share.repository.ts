import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingSessionShare } from '../entities/core/meeting-session-share.entity';

@Injectable()
export class MeetingSessionShareRepository {
  constructor(
    @InjectRepository(MeetingSessionShare)
    private readonly repo: Repository<MeetingSessionShare>,
  ) {}

  create(data: Partial<MeetingSessionShare>): MeetingSessionShare {
    return this.repo.create(data);
  }

  async save(share: MeetingSessionShare): Promise<MeetingSessionShare> {
    return this.repo.save(share);
  }

  async findById(id: string): Promise<MeetingSessionShare | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySessionId(sessionId: string): Promise<MeetingSessionShare[]> {
    return this.repo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async existsBySessionAndEmail(
    sessionId: string,
    email: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: { sessionId, email: email.trim().toLowerCase() },
    });
    return count > 0;
  }

  async remove(share: MeetingSessionShare): Promise<void> {
    await this.repo.remove(share);
  }

  async removeById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
