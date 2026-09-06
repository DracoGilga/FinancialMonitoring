import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { RedisSessionStore } from '../src/3_interface_adapters/gateways/auth/RedisSessionStore';
import { SecureRefreshTokenGenerator } from '../src/3_interface_adapters/gateways/auth/SecureRefreshTokenGenerator';

const describeRedisIntegration =
  process.env.REDIS_INTEGRATION === 'true' ? describe : describe.skip;

describeRedisIntegration('RedisSessionStore integration', () => {
  const store = new RedisSessionStore(
    process.env.REDIS_HOST || 'redis',
    parseInt(process.env.REDIS_PORT || '6379', 10),
    process.env.REDIS_PASSWORD,
  );
  const tokenGenerator = new SecureRefreshTokenGenerator();
  const refreshToken = tokenGenerator.generate();
  const refreshTokenHash = tokenGenerator.hash(refreshToken);

  beforeAll(async () => {
    await store.onModuleInit();
  });

  afterAll(async () => {
    await store.delete(refreshTokenHash);
    await store.onModuleDestroy();
  });

  it('stores and retrieves a session by the refresh token hash', async () => {
    const expiresAt = new Date(Date.now() + 60_000);

    await store.save(
      refreshTokenHash,
      {
        userId: 'redis-test-user',
        expiresAt,
        ip: '127.0.0.1',
        userAgent: 'redis-integration-test',
      },
      60,
    );

    await expect(store.find(refreshTokenHash)).resolves.toEqual({
      userId: 'redis-test-user',
      expiresAt,
      ip: '127.0.0.1',
      userAgent: 'redis-integration-test',
    });
  });

  it('deletes a rotated refresh token session', async () => {
    await store.delete(refreshTokenHash);

    await expect(store.find(refreshTokenHash)).resolves.toBeNull();
  });
});
