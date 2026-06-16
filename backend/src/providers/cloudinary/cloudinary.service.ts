import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary configured successfully');
    } else {
      this.logger.warn(
        'Cloudinary credentials missing in environment. Cloudinary uploads are disabled.',
      );
    }
  }

  async uploadImage(
    fileBuffer: Buffer,
    folder: string,
    publicId: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            this.logger.error('Failed to upload to Cloudinary', error);
            return reject(
              new Error(error.message || 'Failed to upload to Cloudinary'),
            );
          }
          if (!result) {
            return reject(new Error('Cloudinary upload result was undefined'));
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  hasCredentials(): boolean {
    return this.isConfigured;
  }
}
