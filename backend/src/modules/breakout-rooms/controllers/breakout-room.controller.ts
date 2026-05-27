import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BreakoutRoomService } from '../services/breakout-room.service';
import { SetupBreakoutRoomsDto } from '../dto/breakout-room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:id/breakout-rooms')
@UseGuards(JwtAuthGuard)
export class BreakoutRoomController {
  constructor(private readonly breakoutRoomService: BreakoutRoomService) {}

  @Post('setup')
  async setup(
    @Param('id') id: string,
    @Body() dto: SetupBreakoutRoomsDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.breakoutRoomService.setupBreakoutRooms(id, req.user.id, dto);
  }

  @Get()
  async findAll(@Param('id') id: string) {
    return this.breakoutRoomService.getBreakoutRooms(id);
  }

  @Post('start')
  async start(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.breakoutRoomService.startBreakout(id, req.user.id);
  }

  @Post('end')
  async end(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.breakoutRoomService.endBreakout(id, req.user.id);
  }

  @Post('leave')
  async leave(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.breakoutRoomService.leaveBreakoutRoom(id, req.user.id);
  }

  @Get('my-token')
  async getMyToken(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.breakoutRoomService.getBreakoutToken(id, req.user.id);
  }
}
