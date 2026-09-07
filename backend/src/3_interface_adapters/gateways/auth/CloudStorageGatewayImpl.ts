// src/3_interface_adapters/gateways/auth/CloudStorageGatewayImpl.ts
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline,
} from '@azure/storage-blob';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { IStorageGateway } from '../../../2_use_cases/auth/shared_ports/IStorageGateway';

type CloudProvider = 'aws' | 'gcp' | 'azure' | 'oracle';

export interface CloudStorageConfig {
  provider: CloudProvider;
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  projectId?: string;
  keyFilename?: string;
  accountName?: string;
  accountKey?: string;
  container?: string;
}

@Injectable()
export class CloudStorageGatewayImpl implements IStorageGateway {
  private readonly s3Client?: S3Client;
  private readonly gcpBucket?: ReturnType<Storage['bucket']>;
  private readonly azureContainer?: ReturnType<
    BlobServiceClient['getContainerClient']
  >;

  constructor(private readonly config: CloudStorageConfig) {
    if (!config.bucket && config.provider !== 'azure') {
      throw new Error(`${config.provider} storage requires a bucket`);
    }

    if (config.provider === 'gcp') {
      const storage = new Storage({
        ...(config.projectId && { projectId: config.projectId }),
        ...(config.keyFilename && { keyFilename: config.keyFilename }),
        ...(config.endpoint && { apiEndpoint: config.endpoint }),
      });
      this.gcpBucket = storage.bucket(config.bucket);
      return;
    }

    if (config.provider === 'azure') {
      if (!config.accountName || !config.accountKey || !config.container) {
        throw new Error(
          'Azure storage requires account name, account key and container',
        );
      }

      const credential = new StorageSharedKeyCredential(
        config.accountName,
        config.accountKey,
      );
      const serviceEndpoint =
        config.endpoint ||
        `https://${config.accountName}.blob.core.windows.net`;
      const pipeline = newPipeline(credential);
      const service = new BlobServiceClient(serviceEndpoint, pipeline);
      this.azureContainer = service.getContainerClient(config.container);
      return;
    }

    if (!config.region || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error(
        `${config.provider} storage requires region and S3 credentials`,
      );
    }

    if (config.provider === 'oracle' && !config.endpoint) {
      throw new Error('Oracle storage requires an S3-compatible endpoint');
    }

    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle:
        config.provider === 'oracle' ||
        (config.provider === 'aws' && Boolean(config.endpoint)),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async saveFile(fileName: string, buffer: Buffer): Promise<string> {
    const objectName = this.safeObjectName(fileName);

    try {
      if (this.config.provider === 'gcp') {
        const [exists] = (await this.gcpBucket?.exists()) ?? [false];
        if (!exists) await this.gcpBucket?.create();
        await this.gcpBucket?.file(objectName).save(buffer, {
          resumable: false,
          contentType: 'image/jpeg',
        });
        return fileName;
      }

      if (this.config.provider === 'azure') {
        await this.azureContainer?.createIfNotExists();
        await this.azureContainer
          ?.getBlockBlobClient(objectName)
          .uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: 'image/jpeg' },
          });
        return fileName;
      }

      await this.s3Client?.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: objectName,
          Body: buffer,
          ContentType: 'image/jpeg',
        }),
      );
      return fileName;
    } catch {
      throw new InternalServerErrorException(
        'Error saving profile picture to cloud storage',
      );
    }
  }

  async getFileBuffer(fileName: string): Promise<Buffer> {
    const objectName = this.safeObjectName(fileName);

    try {
      if (this.config.provider === 'gcp') {
        const [buffer] =
          (await this.gcpBucket?.file(objectName).download()) ?? [];
        if (!buffer) throw new Error('Cloud object not found');
        return buffer;
      }

      if (this.config.provider === 'azure') {
        return (
          (await this.azureContainer
            ?.getBlobClient(objectName)
            .downloadToBuffer()) ?? Buffer.alloc(0)
        );
      }

      const response = await this.s3Client?.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: objectName,
        }),
      );
      if (!response?.Body) throw new Error('Cloud object not found');

      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(
          'The requested profile picture was not found',
        );
      }
      throw new InternalServerErrorException(
        'Error reading profile picture from cloud storage',
      );
    }
  }

  private safeObjectName(fileName: string): string {
    if (
      !fileName ||
      fileName !== fileName.trim() ||
      !/^[A-Za-z0-9_-]+\.jpg$/.test(fileName)
    ) {
      throw new BadRequestException('Invalid profile picture file name');
    }

    return fileName;
  }

  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as {
      name?: string;
      code?: string;
      statusCode?: number;
    };
    return (
      candidate.name === 'NotFound' ||
      candidate.code === 'NoSuchKey' ||
      candidate.statusCode === 404
    );
  }
}
