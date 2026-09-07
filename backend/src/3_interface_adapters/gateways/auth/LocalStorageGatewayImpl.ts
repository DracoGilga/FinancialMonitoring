// src/3_interface_adapters/gateways/auth/LocalStorageGatewayImpl.ts
// backend/src/3_interface_adapters/gateways/auth/LocalStorageGatewayImpl.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageGateway } from '../../../2_use_cases/auth/shared_ports/IStorageGateway';

@Injectable()
export class LocalStorageGatewayImpl implements IStorageGateway {
  private readonly uploadDirectory: string;

  constructor(uploadDirectory: string) {
    this.uploadDirectory = uploadDirectory;
    if (!fs.existsSync(this.uploadDirectory)) {
      fs.mkdirSync(this.uploadDirectory, { recursive: true });
    }
  }

  async saveFile(fileName: string, buffer: Buffer): Promise<string> {
    try {
      const filePath = this.resolveSafeFilePath(fileName);
      await fs.promises.writeFile(filePath, buffer);
      return fileName;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error saving profile picture to local disk',
      );
    }
  }

  async getFileBuffer(fileName: string): Promise<Buffer> {
    try {
      const filePath = this.resolveSafeFilePath(fileName);
      return await fs.promises.readFile(filePath);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new NotFoundException(
        'The requested profile picture was not found on the server',
      );
    }
  }

  private resolveSafeFilePath(fileName: string): string {
    const resolvedDirectory = path.resolve(this.uploadDirectory);
    const resolvedFilePath = path.resolve(resolvedDirectory, fileName);
    const relativePath = path.relative(resolvedDirectory, resolvedFilePath);

    if (
      !relativePath ||
      relativePath.startsWith('..') ||
      path.isAbsolute(relativePath) ||
      relativePath !== fileName
    ) {
      throw new BadRequestException('Invalid profile picture file name');
    }

    return resolvedFilePath;
  }
}
