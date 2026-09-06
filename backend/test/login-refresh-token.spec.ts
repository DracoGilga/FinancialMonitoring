import { describe, expect, it, jest } from '@jest/globals';
import { User } from '../src/1_entities/auth/User';
import { LoginManualInteractor } from '../src/2_use_cases/auth/login_manual/LoginManualInteractor';
import { ILoginOutputPort } from '../src/2_use_cases/auth/login_manual/ILoginOutputPort';
import { IAuthCommandGateway } from '../src/2_use_cases/auth/shared_ports/IAuthCommandGateway';
import { IAuthQueryGateway } from '../src/2_use_cases/auth/shared_ports/IAuthQueryGateway';
import { IPasswordHasher } from '../src/2_use_cases/auth/shared_ports/IPasswordHasher';
import { IRefreshTokenGenerator } from '../src/2_use_cases/auth/shared_ports/IRefreshTokenGenerator';
import { ISessionStore } from '../src/2_use_cases/auth/shared_ports/ISessionStore';
import { ITokenGenerator } from '../src/2_use_cases/auth/shared_ports/ITokenGenerator';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

describe('login refresh token contract', () => {
  it('returns the same refresh token whose hash is stored in Redis', async () => {
    const user = new User(
      'user-1',
      'user@example.com',
      'Cesar',
      null,
      true,
      'stored-hash',
    );
    const queryGateway: jest.Mocked<IAuthQueryGateway> = {
      findUserByEmail:
        mock<IAuthQueryGateway['findUserByEmail']>().mockResolvedValue(user),
      findUserById: mock<IAuthQueryGateway['findUserById']>(),
    };
    const commandGateway: jest.Mocked<IAuthCommandGateway> = {
      saveSession: mock<IAuthCommandGateway['saveSession']>(),
      saveNewOAuthUser: mock<IAuthCommandGateway['saveNewOAuthUser']>(),
      saveNewUser: mock<IAuthCommandGateway['saveNewUser']>(),
      updateUser: mock<IAuthCommandGateway['updateUser']>(),
    };
    const passwordHasher: jest.Mocked<IPasswordHasher> = {
      hash: mock<IPasswordHasher['hash']>(),
      compare: mock<IPasswordHasher['compare']>().mockResolvedValue(true),
    };
    const tokenGenerator: jest.Mocked<ITokenGenerator> = {
      generateAccessToken:
        mock<ITokenGenerator['generateAccessToken']>().mockReturnValue(
          'access-token',
        ),
    };
    const refreshTokenGenerator: jest.Mocked<IRefreshTokenGenerator> = {
      generate: mock<IRefreshTokenGenerator['generate']>().mockReturnValue(
        'refresh-token-from-login',
      ),
      hash: mock<IRefreshTokenGenerator['hash']>((token) => `hash:${token}`),
    };
    const sessionStore: jest.Mocked<ISessionStore> = {
      save: mock<ISessionStore['save']>(),
      find: mock<ISessionStore['find']>(),
      delete: mock<ISessionStore['delete']>(),
    };
    const outputPort: jest.Mocked<ILoginOutputPort> = {
      presentSuccess: mock<ILoginOutputPort['presentSuccess']>((response) => ({
        status: 'success' as const,
        data: {
          token: response.accessToken,
          refreshToken: response.refreshToken,
          user_name: response.firstName,
        },
      })),
      presentError: mock<ILoginOutputPort['presentError']>(),
    };

    const interactor = new LoginManualInteractor(
      queryGateway,
      commandGateway,
      passwordHasher,
      tokenGenerator,
      7,
      outputPort,
      sessionStore,
      refreshTokenGenerator,
    );

    const result = await interactor.execute({
      email: 'user@example.com',
      plainPassword: 'password',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(result).toMatchObject({
      status: 'success',
      data: { refreshToken: 'refresh-token-from-login' },
    });
    expect(refreshTokenGenerator.hash).toHaveBeenCalledWith(
      'refresh-token-from-login',
    );
    expect(sessionStore.save).toHaveBeenCalledWith(
      'hash:refresh-token-from-login',
      expect.objectContaining({ userId: 'user-1' }),
      expect.any(Number),
    );
  });
});
