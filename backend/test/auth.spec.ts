import { OAuthProfile } from '../src/2_use_cases/auth/login_oauth/IOAuthValidationGateway';
import { LoginOAuthInteractor } from '../src/2_use_cases/auth/login_oauth/LoginOAuthInteractor';
import { LoginOAuthRequest } from '../src/2_use_cases/auth/login_oauth/LoginOAuthRequest';
import { ILoginOAuthOutputPort } from '../src/2_use_cases/auth/login_oauth/ILoginOAuthOutputPort';
import { LoginManualInteractor } from '../src/2_use_cases/auth/login_manual/LoginManualInteractor';
import { LoginManualRequest } from '../src/2_use_cases/auth/login_manual/LoginManualRequest';
import { ILoginOutputPort } from '../src/2_use_cases/auth/login_manual/ILoginOutputPort';
import { RegisterManualInteractor } from '../src/2_use_cases/auth/register_manual/RegisterManualInteractor';
import { IRegisterManualOutputPort } from '../src/2_use_cases/auth/register_manual/IRegisterManualOutputPort';
import { IAuthCommandGateway } from '../src/2_use_cases/auth/shared_ports/IAuthCommandGateway';
import { IAuthQueryGateway } from '../src/2_use_cases/auth/shared_ports/IAuthQueryGateway';
import { IPasswordHasher } from '../src/2_use_cases/auth/shared_ports/IPasswordHasher';
import { ITokenGenerator } from '../src/2_use_cases/auth/shared_ports/ITokenGenerator';
import { User } from '../src/1_entities/auth/User';

const activeUser = (passwordHash: string | null = 'stored-hash') =>
  new User(
    'user-1',
    'user@example.com',
    'Cesar',
    'Developer',
    true,
    passwordHash,
  );

const createAuthCommandGateway = (): jest.Mocked<IAuthCommandGateway> => ({
  saveSession: jest.fn(),
  saveNewOAuthUser: jest.fn(),
  saveNewUser: jest.fn(),
});

describe('manual registration', () => {
  it('registers a user with a hashed password', async () => {
    const queryGateway: jest.Mocked<IAuthQueryGateway> = {
      findUserByEmail: jest.fn().mockResolvedValue(null),
    };
    const commandGateway = createAuthCommandGateway();
    const passwordHasher: jest.Mocked<IPasswordHasher> = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn(),
    };
    const outputPort: jest.Mocked<IRegisterManualOutputPort> = {
      presentSuccess: jest.fn((response) => ({
        status: 'success' as const,
        data: {
          id: response.id,
          email: response.email,
          user_name: response.firstName,
        },
      })),
      presentError: jest.fn(),
    };
    const interactor = new RegisterManualInteractor(
      queryGateway,
      commandGateway,
      passwordHasher,
      outputPort,
    );

    const result = await interactor.execute({
      email: 'new@example.com',
      password: 'plain-password',
      firstName: 'New',
      lastName: 'User',
    });

    expect(result.status).toBe('success');
    expect(passwordHasher.hash).toHaveBeenCalledWith('plain-password');
    expect(commandGateway.saveNewUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com' }),
    );
    expect(outputPort.presentError).not.toHaveBeenCalled();
  });

  it.each([
    ['duplicate email', activeUser(), 'El correo ya está registrado'],
    ['invalid email', null, 'El formato del correo es inválido'],
  ])('rejects %s', async (_caseName, existingUser, message) => {
    const queryGateway: jest.Mocked<IAuthQueryGateway> = {
      findUserByEmail: jest.fn().mockResolvedValue(existingUser),
    };
    const commandGateway = createAuthCommandGateway();
    const passwordHasher: jest.Mocked<IPasswordHasher> = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn(),
    };
    const outputPort: jest.Mocked<IRegisterManualOutputPort> = {
      presentSuccess: jest.fn(),
      presentError: jest.fn((error) => ({
        status: 'error' as const,
        message: error.message,
      })),
    };
    const interactor = new RegisterManualInteractor(
      queryGateway,
      commandGateway,
      passwordHasher,
      outputPort,
    );

    const result = await interactor.execute({
      email: existingUser ? 'user@example.com' : 'invalid-email',
      password: 'plain-password',
      firstName: 'New',
    });

    expect(result).toEqual({ status: 'error', message });
    expect(commandGateway.saveNewUser).not.toHaveBeenCalled();
  });
});

describe('manual login and authorization rules', () => {
  const createLogin = (user: User | null, passwordValid = true) => {
    const queryGateway: jest.Mocked<IAuthQueryGateway> = {
      findUserByEmail: jest.fn().mockResolvedValue(user),
    };
    const commandGateway = createAuthCommandGateway();
    const passwordHasher: jest.Mocked<IPasswordHasher> = {
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(passwordValid),
    };
    const tokenGenerator: jest.Mocked<ITokenGenerator> = {
      generateAccessToken: jest.fn().mockReturnValue('access-token'),
    };
    const outputPort: jest.Mocked<ILoginOutputPort> = {
      presentSuccess: jest.fn((response) => ({
        status: 'success' as const,
        data: {
          token: response.accessToken,
          refresh_token: response.refreshToken,
          user_name: response.firstName,
        },
      })),
      presentError: jest.fn((error) => ({
        status: 'error' as const,
        message: error.message,
      })),
    };
    return {
      interactor: new LoginManualInteractor(
        queryGateway,
        commandGateway,
        passwordHasher,
        tokenGenerator,
        7,
        outputPort,
      ),
      commandGateway,
      passwordHasher,
      tokenGenerator,
    };
  };

  it('creates a token and session for valid credentials', async () => {
    const login = createLogin(activeUser());

    const result = await login.interactor.execute(
      new LoginManualRequest('user@example.com', 'plain-password'),
    );

    expect(result).toMatchObject({
      status: 'success',
      data: { token: 'access-token', user_name: 'Cesar' },
    });
    expect(login.passwordHasher.compare).toHaveBeenCalledWith(
      'plain-password',
      'stored-hash',
    );
    expect(login.commandGateway.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        expiresAt: expect.any(Date),
      }),
    );
  });

  it.each([
    ['unknown user', null, true, 'Credenciales inválidas'],
    ['wrong password', activeUser(), false, 'Credenciales inválidas'],
    [
      'inactive user',
      new User(
        'user-1',
        'user@example.com',
        'Cesar',
        null,
        false,
        'stored-hash',
      ),
      true,
      'El usuario está inactivo',
    ],
  ])('rejects %s', async (_caseName, user, passwordValid, message) => {
    const login = createLogin(user, passwordValid);

    const result = await login.interactor.execute(
      new LoginManualRequest('user@example.com', 'plain-password'),
    );

    expect(result).toEqual({ status: 'error', message });
    expect(login.commandGateway.saveSession).not.toHaveBeenCalled();
    expect(login.tokenGenerator.generateAccessToken).not.toHaveBeenCalled();
  });
});

describe('OAuth login', () => {
  const profile: OAuthProfile = {
    providerId: 'google-1',
    email: 'oauth@example.com',
    firstName: 'OAuth',
    lastName: 'User',
  };

  const createOAuthLogin = (user: User | null) => {
    const queryGateway: jest.Mocked<IAuthQueryGateway> = {
      findUserByEmail: jest.fn().mockResolvedValue(user),
    };
    const commandGateway = createAuthCommandGateway();
    const oauthGateway = {
      verifyTokenAndGetProfile: jest.fn().mockResolvedValue(profile),
    };
    const tokenGenerator: jest.Mocked<ITokenGenerator> = {
      generateAccessToken: jest.fn().mockReturnValue('oauth-token'),
    };
    const outputPort: jest.Mocked<ILoginOAuthOutputPort> = {
      presentSuccess: jest.fn((response) => ({
        status: 'success' as const,
        data: {
          token: response.accessToken,
          refresh_token: response.refreshToken,
          user_name: response.userFirstName,
          is_new_user: response.isNewUser,
        },
      })),
      presentError: jest.fn((error): never => {
        throw error;
      }),
    };
    return {
      interactor: new LoginOAuthInteractor(
        queryGateway,
        commandGateway,
        oauthGateway,
        tokenGenerator,
        7,
        outputPort,
      ),
      commandGateway,
      tokenGenerator,
    };
  };

  it('creates the user, OAuth account and session for a new provider identity', async () => {
    const login = createOAuthLogin(null);

    const result = await login.interactor.execute(
      new LoginOAuthRequest('google', 'provider-token'),
    );

    expect(result).toMatchObject({
      status: 'success',
      data: { is_new_user: true, token: 'oauth-token' },
    });
    expect(login.commandGateway.saveNewOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: profile.email }),
      expect.objectContaining({
        providerName: 'google',
        providerId: profile.providerId,
      }),
    );
    expect(login.commandGateway.saveSession).toHaveBeenCalled();
  });

  it('logs in an existing active OAuth user without creating a duplicate account', async () => {
    const login = createOAuthLogin(activeUser(null));

    const result = await login.interactor.execute(
      new LoginOAuthRequest('google', 'provider-token'),
    );

    expect(result).toMatchObject({
      status: 'success',
      data: { is_new_user: false },
    });
    expect(login.commandGateway.saveNewOAuthUser).not.toHaveBeenCalled();
    expect(login.commandGateway.saveSession).toHaveBeenCalled();
  });

  it('rejects an inactive existing user', async () => {
    const login = createOAuthLogin(
      new User('user-1', profile.email, 'OAuth', null, false, null),
    );

    await expect(
      login.interactor.execute(
        new LoginOAuthRequest('google', 'provider-token'),
      ),
    ).rejects.toThrow('El usuario está inactivo');
    expect(login.tokenGenerator.generateAccessToken).not.toHaveBeenCalled();
  });
});
