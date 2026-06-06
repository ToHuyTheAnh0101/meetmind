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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { AttachmentService } from '../services/attachment.service';
import { Attachment, AttachmentType } from '../entities/attachment.entity';
import { CreateAttachmentDto } from '../dto/create-attachment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function getAttachmentType(mimeType: string): AttachmentType {
  if (!mimeType) return AttachmentType.OTHER;
  if (mimeType.startsWith('image/')) return AttachmentType.IMAGE;
  if (mimeType.startsWith('audio/')) return AttachmentType.AUDIO;
  if (mimeType.startsWith('video/')) return AttachmentType.VIDEO;
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('msword') ||
    mimeType.includes('officedocument') ||
    mimeType.includes('text/')
  ) {
    return AttachmentType.DOCUMENT;
  }
  return AttachmentType.OTHER;
}

@Controller('meetings/:meetingId/attachments')
export class AttachmentController {
  constructor(
    private attachmentService: AttachmentService,
    private configService: ConfigService,
  ) {}

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

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('meetingId') meetingId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: { user: { id: string } },
  ): Promise<Attachment> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const mimeType = file.mimetype || 'application/octet-stream';
    const type = getAttachmentType(mimeType);

    // 1. Create a draft attachment in database to reserve a unique ID
    const draftAttachment = await this.attachmentService.create(meetingId, {
      fileName: file.originalname || 'unnamed_file',
      fileSize: file.size || 0,
      mimeType,
      type,
      uploadedByUserId: req.user.id,
      fileUrl: '', // Will update
    });

    const attachmentId = draftAttachment.id!;

    // 2. Save physical file to uploads/attachments/:meetingId/:attachmentId
    try {
      const dirPath = path.join(
        process.cwd(),
        'uploads',
        'attachments',
        meetingId,
      );
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, attachmentId);
      fs.writeFileSync(filePath, file.buffer);
    } catch {
      // Cleanup the DB record if write fails
      await this.attachmentService.remove(attachmentId);
      throw new BadRequestException('Failed to save physical file to disk');
    }

    // 3. Update the attachment URL pointing to our streaming download endpoint
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const fileUrl = `${backendUrl}/meetings/${meetingId}/attachments/download/${attachmentId}`;

    return this.attachmentService.updateUrl(attachmentId, fileUrl);
  }

  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) {
      throw new NotFoundException('Attachment record not found');
    }

    const filePath = path.join(
      process.cwd(),
      'uploads',
      'attachments',
      meetingId,
      id,
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Physical file not found on server');
    }

    // Force browser download with original file name
    res.setHeader(
      'Content-Type',
      attachment.mimeType || 'application/octet-stream',
    );

    // URL-encode filename to safely support special/Vietnamese characters
    const encodedFilename = encodeURIComponent(attachment.fileName || 'file');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
    );

    res.sendFile(filePath);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.attachmentService.remove(id);
  }
}
