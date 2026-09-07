// src/3_interface_adapters/gateways/auth/SharpImageProcessorImpl.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { IImageProcessorGateway } from '../../../2_use_cases/auth/shared_ports/IImageProcessorGateway';
import sharp from 'sharp';

@Injectable()
export class SharpImageProcessorImpl implements IImageProcessorGateway {
  async sanitizeAndProcess(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer, { limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();

      if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
        throw new BadRequestException('Only PNG or JPEG images are allowed.');
      }

      return await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    } catch {
      throw new BadRequestException(
        'The provided file is not a valid image or is corrupted.',
      );
    }
  }
}
