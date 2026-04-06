import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttachmentService } from '../services/attachment.service';
import { Attachment } from '../entities';
import { CreateAttachmentDto } from '../dto/create-attachment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/attachments')
export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('meetingId') meetingId: string): Promise<Attachment[]> {
    return this.attachmentService.findByMeetingId(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<Attachment> {
    return this.attachmentService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateAttachmentDto,
    @Request() req: { user: { id: string } },
  ): Promise<Attachment> {
    return this.attachmentService.create(meetingId, {
      ...dto,
      uploadedByUserId: req.user.id,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.attachmentService.remove(id);
  }
}
