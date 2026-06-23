import {
  Controller,
  Get,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UserProfileDto } from '../dto/user-profile.dto';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(
    @Request() req: { user: { id: string } },
  ): Promise<UserProfileDto> {
    const user: User | null = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
