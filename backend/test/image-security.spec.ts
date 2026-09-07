// test/image-security.spec.ts
import { afterAll, describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SharpImageProcessorImpl } from '../src/3_interface_adapters/gateways/auth/SharpImageProcessorImpl';
import { LocalStorageGatewayImpl } from '../src/3_interface_adapters/gateways/auth/LocalStorageGatewayImpl';

const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const temporaryStorageDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'financial-monitoring-'),
);

afterAll(() => {
  fs.rmSync(temporaryStorageDirectory, { recursive: true, force: true });
});

describe('image input security', () => {
  it('accepts a real PNG and normalizes it to JPEG', async () => {
    const processor = new SharpImageProcessorImpl();

    const result = await processor.sanitizeAndProcess(validPng);

    expect(result.subarray(0, 3).toString('hex')).toBe('ffd8ff');
  });

  it.each([
    ['javascript payload', Buffer.from('<script>alert(1)</script>')],
    ['SVG payload', Buffer.from('<svg><script>alert(1)</script></svg>')],
    ['remote image URL', Buffer.from('https://evil.example/payload.jpg')],
    ['random binary', Buffer.from([0, 1, 2, 3, 4, 5])],
  ])('rejects a %s as an image', async (_name, payload) => {
    const processor = new SharpImageProcessorImpl();

    await expect(processor.sanitizeAndProcess(payload)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects path traversal in local storage', async () => {
    const storage = new LocalStorageGatewayImpl(temporaryStorageDirectory);

    await expect(
      storage.saveFile('../outside.jpg', Buffer.from('payload')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.getFileBuffer('../outside.jpg'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
