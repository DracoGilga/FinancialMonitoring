// test/cloud-storage-gateway.spec.ts
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CloudStorageGatewayImpl } from '../src/3_interface_adapters/gateways/auth/CloudStorageGatewayImpl';
import { LocalStorageGatewayImpl } from '../src/3_interface_adapters/gateways/auth/LocalStorageGatewayImpl';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-storage-tests-'));

afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

describe('LocalStorageGatewayImpl', () => {
  it('creates its directory, saves files and reads them', async () => {
    const directory = path.join(tempRoot, 'new-directory');
    const storage = new LocalStorageGatewayImpl(directory);
    const buffer = Buffer.from('profile image');

    expect(fs.existsSync(directory)).toBe(true);
    await expect(storage.saveFile('user-profile.jpg', buffer)).resolves.toBe(
      'user-profile.jpg',
    );
    await expect(storage.getFileBuffer('user-profile.jpg')).resolves.toEqual(
      buffer,
    );
  });

  it.each(['../outside.jpg', ''])(
    'rejects unsafe file name %s',
    async (fileName) => {
      const storage = new LocalStorageGatewayImpl(tempRoot);
      await expect(
        storage.saveFile(fileName, Buffer.from('x')),
      ).rejects.toMatchObject({
        status: 400,
      });
      await expect(storage.getFileBuffer(fileName)).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  it('rejects unsafe file name nested/file.jpg', async () => {
    const storage = new LocalStorageGatewayImpl(tempRoot);
    const nestedFileName = path.join('nested', 'file.jpg');

    await expect(
      storage.saveFile(nestedFileName, Buffer.from('x')),
    ).rejects.toMatchObject({
      status: 500,
    });
  });

  it('maps disk write and read failures', async () => {
    const storage = new LocalStorageGatewayImpl(tempRoot);
    const writeSpy = jest
      .spyOn(fs.promises, 'writeFile')
      .mockRejectedValueOnce(new Error('disk full'));
    await expect(
      storage.saveFile('safe.jpg', Buffer.from('x')),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Error saving profile picture to local disk',
    });
    writeSpy.mockRestore();

    await expect(storage.getFileBuffer('missing.jpg')).rejects.toMatchObject({
      status: 404,
      message: 'The requested profile picture was not found on the server',
    });
  });
});

type S3ClientMock = {
  send: jest.MockedFunction<(command: object) => Promise<S3Result>>;
};
type S3Result = {
  Body?: { transformToByteArray(): Promise<Uint8Array> };
};

const awsGateway = () =>
  new CloudStorageGatewayImpl({
    provider: 'aws',
    bucket: 'profiles',
    region: 'test-region',
    accessKeyId: 'access',
    secretAccessKey: 'secret',
  });

const injectPrivate = (
  target: object,
  property: string,
  value: object,
): void => {
  Object.defineProperty(target, property, { value, configurable: true });
};

describe('CloudStorageGatewayImpl S3-compatible providers', () => {
  let client: S3ClientMock;

  beforeEach(() => {
    client = { send: mock<(command: object) => Promise<S3Result>>() };
  });

  it('uploads and downloads AWS objects', async () => {
    const gateway = awsGateway();
    injectPrivate(gateway, 's3Client', client);
    client.send.mockResolvedValueOnce({}).mockResolvedValueOnce({
      Body: {
        transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])),
      },
    });

    await expect(
      gateway.saveFile('user-profile.jpg', Buffer.from('image')),
    ).resolves.toBe('user-profile.jpg');
    await expect(gateway.getFileBuffer('user-profile.jpg')).resolves.toEqual(
      Buffer.from([1, 2, 3]),
    );
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it('maps S3 upload, missing object and read failures', async () => {
    const gateway = awsGateway();
    injectPrivate(gateway, 's3Client', client);
    client.send.mockRejectedValueOnce(new Error('upload failed'));
    await expect(
      gateway.saveFile('safe.jpg', Buffer.from('image')),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Error saving profile picture to cloud storage',
    });

    client.send.mockResolvedValueOnce({});
    await expect(gateway.getFileBuffer('safe.jpg')).rejects.toMatchObject({
      status: 500,
      message: 'Error reading profile picture from cloud storage',
    });

    for (const notFound of [
      { code: 'NoSuchKey' },
      { name: 'NotFound' },
      { statusCode: 404 },
    ]) {
      client.send.mockRejectedValueOnce(notFound);
      await expect(gateway.getFileBuffer('safe.jpg')).rejects.toMatchObject({
        status: 404,
        message: 'The requested profile picture was not found',
      });
    }
    client.send.mockRejectedValueOnce(null);
    await expect(gateway.getFileBuffer('safe.jpg')).rejects.toMatchObject({
      status: 500,
    });
  });

  it.each([
    ['', 'aws storage requires a bucket'],
    ['missing-credentials', 'aws storage requires region and S3 credentials'],
  ])('validates AWS configuration %s', (scenario, message) => {
    expect(
      () =>
        new CloudStorageGatewayImpl(
          scenario === ''
            ? { provider: 'aws', bucket: '' }
            : { provider: 'aws', bucket: 'profiles' },
        ),
    ).toThrow(message);
  });

  it('requires an Oracle endpoint and accepts valid S3 endpoints', () => {
    expect(
      () =>
        new CloudStorageGatewayImpl({
          provider: 'oracle',
          bucket: 'profiles',
          region: 'region',
          accessKeyId: 'access',
          secretAccessKey: 'secret',
        }),
    ).toThrow('Oracle storage requires an S3-compatible endpoint');
    expect(
      () =>
        new CloudStorageGatewayImpl({
          provider: 'oracle',
          bucket: 'profiles',
          region: 'region',
          accessKeyId: 'access',
          secretAccessKey: 'secret',
          endpoint: 'https://oracle.example',
        }),
    ).not.toThrow();
    expect(
      () =>
        new CloudStorageGatewayImpl({
          provider: 'aws',
          bucket: 'profiles',
          region: 'region',
          accessKeyId: 'access',
          secretAccessKey: 'secret',
          endpoint: 'http://localhost:9000',
        }),
    ).not.toThrow();
  });
});

type GcpFile = {
  save: jest.MockedFunction<(buffer: Buffer, options: object) => Promise<void>>;
  download: jest.MockedFunction<() => Promise<[Buffer]>>;
};
type GcpBucket = {
  exists: jest.MockedFunction<() => Promise<[boolean]>>;
  create: jest.MockedFunction<() => Promise<void>>;
  file: jest.MockedFunction<(name: string) => GcpFile>;
};

describe('CloudStorageGatewayImpl GCP and Azure branches', () => {
  it('creates a GCP bucket, uploads and downloads objects', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'gcp',
      bucket: 'profiles',
      projectId: 'project',
    });
    const file: GcpFile = {
      save: mock<GcpFile['save']>().mockResolvedValue(undefined),
      download: mock<GcpFile['download']>().mockResolvedValue([
        Buffer.from('download'),
      ]),
    };
    const bucket: GcpBucket = {
      exists: mock<GcpBucket['exists']>().mockResolvedValue([false]),
      create: mock<GcpBucket['create']>().mockResolvedValue(undefined),
      file: mock<GcpBucket['file']>().mockReturnValue(file),
    };
    injectPrivate(gateway, 'gcpBucket', bucket);

    await expect(
      gateway.saveFile('user-profile.jpg', Buffer.from('upload')),
    ).resolves.toBe('user-profile.jpg');
    expect(bucket.create).toHaveBeenCalled();
    await expect(gateway.getFileBuffer('user-profile.jpg')).resolves.toEqual(
      Buffer.from('download'),
    );
  });

  it('maps GCP upload and download errors', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'gcp',
      bucket: 'profiles',
    });
    const file: GcpFile = {
      save: mock<GcpFile['save']>().mockRejectedValue(new Error('failed')),
      download: mock<GcpFile['download']>().mockRejectedValue({
        statusCode: 404,
      }),
    };
    const bucket: GcpBucket = {
      exists: mock<GcpBucket['exists']>().mockResolvedValue([true]),
      create: mock<GcpBucket['create']>(),
      file: mock<GcpBucket['file']>().mockReturnValue(file),
    };
    injectPrivate(gateway, 'gcpBucket', bucket);

    await expect(
      gateway.saveFile('safe.jpg', Buffer.from('x')),
    ).rejects.toMatchObject({ status: 500 });
    await expect(gateway.getFileBuffer('safe.jpg')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('maps an absent GCP download to a read failure', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'gcp',
      bucket: 'profiles',
    });
    injectPrivate(gateway, 'gcpBucket', {
      file: mock<
        (name: string) => { download: () => Promise<[]> }
      >().mockReturnValue({
        download: () => Promise.resolve([]),
      }),
    });
    await expect(gateway.getFileBuffer('safe.jpg')).rejects.toMatchObject({
      status: 500,
    });
  });

  it('uploads and downloads Azure blobs', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'azure',
      bucket: '',
      accountName: 'account',
      accountKey: 'key',
      container: 'profiles',
    });
    const uploadData =
      mock<
        (buffer: Buffer, options: object) => Promise<void>
      >().mockResolvedValue(undefined);
    const downloadToBuffer = mock<() => Promise<Buffer>>().mockResolvedValue(
      Buffer.from('azure'),
    );
    const container = {
      createIfNotExists:
        mock<() => Promise<void>>().mockResolvedValue(undefined),
      getBlockBlobClient: mock<
        (name: string) => { uploadData: typeof uploadData }
      >().mockReturnValue({ uploadData }),
      getBlobClient: mock<
        (name: string) => { downloadToBuffer: typeof downloadToBuffer }
      >().mockReturnValue({ downloadToBuffer }),
    };
    injectPrivate(gateway, 'azureContainer', container);

    await expect(gateway.saveFile('safe.jpg', Buffer.from('x'))).resolves.toBe(
      'safe.jpg',
    );
    await expect(gateway.getFileBuffer('safe.jpg')).resolves.toEqual(
      Buffer.from('azure'),
    );
  });

  it('maps Azure upload and download failures', async () => {
    const gateway = new CloudStorageGatewayImpl({
      provider: 'azure',
      bucket: '',
      accountName: 'account',
      accountKey: 'key',
      container: 'profiles',
      endpoint: 'http://azure.test',
    });
    const container = {
      createIfNotExists: mock<() => Promise<void>>().mockRejectedValue(
        new Error('upload failed'),
      ),
      getBlockBlobClient: mock<(name: string) => object>(),
      getBlobClient: mock<
        (name: string) => { downloadToBuffer: () => Promise<Buffer> }
      >().mockReturnValue({
        downloadToBuffer: () => Promise.reject(new Error('read failed')),
      }),
    };
    injectPrivate(gateway, 'azureContainer', container);
    await expect(
      gateway.saveFile('safe.jpg', Buffer.from('x')),
    ).rejects.toMatchObject({ status: 500 });
    await expect(gateway.getFileBuffer('safe.jpg')).rejects.toMatchObject({
      status: 500,
    });
  });

  it('requires complete Azure configuration', () => {
    expect(
      () => new CloudStorageGatewayImpl({ provider: 'azure', bucket: '' }),
    ).toThrow('Azure storage requires account name, account key and container');
  });

  it.each(['', ' unsafe.jpg', '../unsafe.jpg', 'unsafe.png'])(
    'rejects unsafe cloud object name %s',
    async (name) => {
      const gateway = awsGateway();
      await expect(
        gateway.saveFile(name, Buffer.from('x')),
      ).rejects.toMatchObject({
        status: 400,
      });
      await expect(gateway.getFileBuffer(name)).rejects.toMatchObject({
        status: 400,
      });
    },
  );
});
