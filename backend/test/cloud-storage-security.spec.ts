// test/cloud-storage-security.spec.ts
import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  CloudStorageGatewayImpl,
  CloudStorageConfig,
} from '../src/3_interface_adapters/gateways/auth/CloudStorageGatewayImpl';

const baseConfig = {
  bucket: 'profiles',
  region: 'test-region',
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
};

describe('cloud storage configuration and object names', () => {
  it.each<CloudStorageConfig>([
    { provider: 'aws', ...baseConfig },
    { provider: 'oracle', ...baseConfig, endpoint: 'https://oracle.example' },
  ])('rejects traversal for $provider', async (config) => {
    const gateway = new CloudStorageGatewayImpl(config);

    await expect(
      gateway.saveFile('../outside.jpg', Buffer.from('image')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects traversal for Google Cloud Storage', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'gcp',
      bucket: 'profiles',
      projectId: 'test-project',
    });

    await expect(
      gateway.getFileBuffer('../../outside.jpg'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects traversal for Azure Blob Storage', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'azure',
      bucket: 'unused',
      accountName: 'test-account',
      accountKey: 'test-key',
      container: 'profiles',
    });

    await expect(
      gateway.saveFile('folder/outside.jpg', Buffer.from('image')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an endpoint for Oracle Object Storage', () => {
    expect(
      () => new CloudStorageGatewayImpl({ provider: 'oracle', ...baseConfig }),
    ).toThrow('Oracle storage requires an S3-compatible endpoint');
  });
});
