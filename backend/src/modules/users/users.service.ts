import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findOrCreateGoogleUser(profile: {
    id: string;
    email: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }): Promise<User> {
    let user = await this.findByGoogleId(profile.id);

    if (!user) {
      user = await this.createUser({
        googleId: profile.id,
        email: profile.email,
        firstName: profile.given_name || 'User',
        lastName: profile.family_name || '',
        picture: profile.picture,
        isActive: true,
      });
    }

    return user;
  }
}
