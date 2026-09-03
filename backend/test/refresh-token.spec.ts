// test/refresh-token.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { RefreshTokenService } from '../src/2_use_cases/auth/refresh/RefreshTokenService';
import type { IAuthQueryGateway } from '../src/2_use_cases/auth/shared_ports/IAuthQueryGateway';
import type { IRefreshTokenGenerator } from '../src/2_use_cases/auth/shared_ports/IRefreshTokenGenerator';
import type {
  ISessionStore,
  SessionRecord,
} from '../src/2_use_cases/auth/shared_ports/ISessionStore';
import type { ITokenGenerator } from '../src/2_use_cases/auth/shared_ports/ITokenGenerator';
import { User } from '../src/1_entities/auth/User';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

describe('RefreshTokenService', () => {
  const session: SessionRecord = {
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  function createService(storedSession: SessionRecord | null = session) {
    const sessionStore: jest.Mocked<ISessionStore> = {
      save: mock<ISessionStore['save']>(),
      find: mock<ISessionStore['find']>().mockResolvedValue(storedSession),
      delete: mock<ISessionStore['delete']>(),
    };
    const refreshTokenGenerator: jest.Mocked<IRefreshTokenGenerator> = {
      generate: mock<IRefreshTokenGenerator['generate']>().mockReturnValue(
        'new-refresh-token',
      ),
      hash: mock<IRefreshTokenGenerator['hash']>((token) => `hash:${token}`),
    };
    const tokenGenerator: jest.Mocked<ITokenGenerator> = {
      generateAccessToken: mock<ITokenGenerator['generateAccessToken']>().mockReturnValue(
        'new-access-token',
      ),
    };
    const authQueryGateway: jest.Mocked<IAuthQueryGateway> = {
      findUserByEmail: mock<IAuthQueryGateway['findUserByEmail']>(),
      findUserById: mock<IAuthQueryGateway['findUserById']>()
        .mockResolvedValue(
          new User('user-1', 'user@example.com', 'Cesar', null, true, null),
        ),
    };

    return {
      service: new RefreshTokenService(
        sessionStore,
        refreshTokenGenerator,
        tokenGenerator,
        authQueryGateway,
        7,
      ),
      sessionStore,
      refreshTokenGenerator,
      tokenGenerator,
    };
  }

  it('rotates a valid token when IP and User-Agent match', async () => {
    const refresh = createService();

    const result = await refresh.service.refresh({
      token: 'old-refresh-token',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(result).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(refresh.sessionStore.delete).toHaveBeenCalledWith(
      'hash:old-refresh-token',
    );
    expect(refresh.sessionStore.save).toHaveBeenCalledWith(
      'hash:new-refresh-token',
      expect.objectContaining({ userId: 'user-1', ip: '127.0.0.1' }),
      expect.any(Number),
    );
  });

  it.each([
    ['different IP', '10.0.0.1', 'test-agent'],
    ['different User-Agent', '127.0.0.1', 'other-agent'],
  ])(
    'denies a request with a mismatched %s and deletes the session',
    async (_caseName, ip, userAgent) => {
      const refresh = createService();

      await expect(
        refresh.service.refresh({ token: 'stolen-token', ip, userAgent }),
      ).rejects.toThrow('Invalid refresh token context');
      expect(refresh.sessionStore.delete).toHaveBeenCalledWith(
        'hash:stolen-token',
      );
      expect(refresh.sessionStore.save).not.toHaveBeenCalled();
    },
  );
});
