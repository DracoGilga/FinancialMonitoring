// test/auth-command-query-gateways.spec.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { User } from '../src/1_entities/auth/User';
import { OAuthAccount } from '../src/1_entities/auth/OAuthAccount';
import { Session } from '../src/1_entities/auth/Session';
import { PrismaService } from '../src/3_interface_adapters/gateways/db/PrismaService';
import { AuthCommandGatewayImpl } from '../src/3_interface_adapters/gateways/auth/AuthCommandGatewayImpl';
import { AuthQueryGatewayImpl } from '../src/3_interface_adapters/gateways/auth/AuthQueryGatewayImpl';
import { OAuthValidationGatewayImpl } from '../src/3_interface_adapters/gateways/auth/OAuthValidationGatewayImpl';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

type Operation = PromiseLike<object>;
type PrismaMock = {
  user: {
    create: jest.MockedFunction<(args: object) => Operation>;
    update: jest.MockedFunction<(args: object) => Operation>;
    findUnique: jest.MockedFunction<(args: object) => Promise<object | null>>;
  };
  oAuthAccount: {
    create: jest.MockedFunction<(args: object) => Operation>;
  };
  session: {
    create: jest.MockedFunction<(args: object) => Operation>;
  };
  $transaction: jest.MockedFunction<
    (operations: Operation[]) => Promise<object[]>
  >;
};

const operation = (): Operation => Promise.resolve({ id: 'created' });
const prismaMock = (): PrismaMock => ({
  user: {
    create: mock<(args: object) => Operation>().mockReturnValue(operation()),
    update: mock<(args: object) => Operation>().mockReturnValue(operation()),
    findUnique: mock<(args: object) => Promise<object | null>>(),
  },
  oAuthAccount: {
    create: mock<(args: object) => Operation>().mockReturnValue(operation()),
  },
  session: {
    create: mock<(args: object) => Operation>().mockReturnValue(operation()),
  },
  $transaction: mock<
    (operations: Operation[]) => Promise<object[]>
  >().mockResolvedValue([]),
});

const activeUser = new User(
  'user-1',
  'user@example.com',
  'Cesar',
  'Developer',
  true,
  'hash',
);

describe('AuthCommandGatewayImpl', () => {
  it('persists manual users, updates, sessions and OAuth users', async () => {
    const prisma = prismaMock();
    const gateway = new AuthCommandGatewayImpl(
      prisma as unknown as PrismaService,
    );

    await gateway.saveNewUser(activeUser);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Cesar',
        lastName: 'Developer',
        isActive: true,
        passwordHash: 'hash',
      },
    });

    await gateway.updateUser('user-1', {
      firstName: 'Updated',
      lastName: null,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { firstName: 'Updated', lastName: null },
    });

    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    await gateway.saveSession(new Session('session-1', 'user-1', expiresAt));
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: { id: 'session-1', userId: 'user-1', expiresAt },
    });

    await gateway.saveNewOAuthUser(
      new User('oauth-1', 'oauth@example.com', 'OAuth', null, true, null),
      new OAuthAccount('oauth-1', 'google', 'google-1'),
    );
    expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
      data: {
        id: 'oauth-1',
        userId: 'oauth-1',
        providerName: 'google',
        providerId: 'google-1',
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      operation(),
      operation(),
    ]);
  });

  it('updates profile pictures and wraps database failures', async () => {
    const prisma = prismaMock();
    const gateway = new AuthCommandGatewayImpl(
      prisma as unknown as PrismaService,
    );

    await expect(
      gateway.updateProfilePicture('user-1', 'user-1-profile.jpg'),
    ).resolves.toBeUndefined();
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: 'user-1' },
      data: { profilePicture: 'user-1-profile.jpg' },
    });

    prisma.user.update.mockRejectedValue(new Error('database failed'));
    await expect(
      gateway.updateProfilePicture('user-1', 'photo.jpg'),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Error updating profile picture in database',
    });
  });
});

describe('AuthQueryGatewayImpl', () => {
  it('maps Prisma users by email and id', async () => {
    const prisma = prismaMock();
    const record = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Cesar',
      lastName: null,
      isActive: true,
      passwordHash: 'hash',
    };
    prisma.user.findUnique.mockResolvedValue(record);
    const gateway = new AuthQueryGatewayImpl(
      prisma as unknown as PrismaService,
    );

    await expect(gateway.findUserByEmail(record.email)).resolves.toEqual(
      new User('user-1', record.email, 'Cesar', null, true, 'hash'),
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: record.email },
    });
    await expect(gateway.findUserById('user-1')).resolves.toBeInstanceOf(User);
    expect(prisma.user.findUnique).toHaveBeenLastCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('returns null when users do not exist', async () => {
    const prisma = prismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const gateway = new AuthQueryGatewayImpl(
      prisma as unknown as PrismaService,
    );

    await expect(
      gateway.findUserByEmail('missing@example.com'),
    ).resolves.toBeNull();
    await expect(gateway.findUserById('missing')).resolves.toBeNull();
  });
});

type GoogleClient = {
  verifyIdToken(options: {
    idToken: string;
    audience: string;
  }): Promise<{ getPayload(): GooglePayload | undefined }>;
};
type GooglePayload = {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
};

const googleClient = (
  payload: GooglePayload | undefined,
): jest.Mocked<GoogleClient> => ({
  verifyIdToken: mock<GoogleClient['verifyIdToken']>().mockResolvedValue({
    getPayload: () => payload,
  }),
});

const jsonResponse = (body: unknown, ok = true): Response =>
  new Response(JSON.stringify(body), {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  });

describe('OAuthValidationGatewayImpl', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('maps Google profiles and default names', async () => {
    const client = googleClient({
      sub: 'google-1',
      email: 'google@example.com',
    });
    const gateway = new OAuthValidationGatewayImpl(
      'client-id',
      'facebook-id',
      'facebook-secret',
      client,
    );

    await expect(
      gateway.verifyTokenAndGetProfile('google', 'token'),
    ).resolves.toEqual({
      providerId: 'google-1',
      email: 'google@example.com',
      firstName: 'User',
      lastName: null,
    });
    expect(client.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: 'client-id',
    });
  });

  it('rejects invalid Google payloads and verification errors', async () => {
    const gateway = new OAuthValidationGatewayImpl(
      'client-id',
      'facebook-id',
      'secret',
      googleClient(undefined),
    );
    await expect(
      gateway.verifyTokenAndGetProfile('google', 'token'),
    ).rejects.toThrow('Error validating Google token');

    const client: jest.Mocked<GoogleClient> = {
      verifyIdToken: mock<GoogleClient['verifyIdToken']>().mockRejectedValue(
        new Error('invalid'),
      ),
    };
    await expect(
      new OAuthValidationGatewayImpl(
        'id',
        'fb',
        'secret',
        client,
      ).verifyTokenAndGetProfile('google', 'token'),
    ).rejects.toThrow('Error validating Google token');
  });

  it('validates and maps Facebook profiles', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ data: { app_id: 'facebook-id' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'facebook-1',
          email: 'facebook@example.com',
          first_name: 'Facebook',
          last_name: 'User',
        }),
      );
    const gateway = new OAuthValidationGatewayImpl(
      'google-id',
      'facebook-id',
      'facebook-secret',
      googleClient(undefined),
    );

    await expect(
      gateway.verifyTokenAndGetProfile('facebook', 'token'),
    ).resolves.toEqual({
      providerId: 'facebook-1',
      email: 'facebook@example.com',
      firstName: 'Facebook',
      lastName: 'User',
    });
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('access_token=facebook-id|facebook-secret'),
    );
  });

  it.each([
    [jsonResponse({}, false), 'The Facebook token is invalid or expired'],
    [
      jsonResponse({ data: { error: { message: 'expired' } } }),
      'The Facebook token is invalid or expired',
    ],
    [
      jsonResponse({ data: { app_id: 'other-app' } }),
      'Security Breach: The token belongs to a different application',
    ],
  ])('rejects invalid Facebook debug responses', async (response, message) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(response);
    const gateway = new OAuthValidationGatewayImpl(
      'google',
      'facebook-id',
      'secret',
      googleClient(undefined),
    );
    await expect(
      gateway.verifyTokenAndGetProfile('facebook', 'token'),
    ).rejects.toThrow(message);
  });

  it('rejects Facebook profiles without identity and wraps network failures', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ data: { app_id: 'facebook-id' } }))
      .mockResolvedValueOnce(jsonResponse({ first_name: 'Missing' }));
    const gateway = new OAuthValidationGatewayImpl(
      'google',
      'facebook-id',
      'secret',
      googleClient(undefined),
    );
    await expect(
      gateway.verifyTokenAndGetProfile('facebook', 'token'),
    ).rejects.toThrow('The Facebook token does not contain the email address');

    fetchSpy.mockReset().mockRejectedValue(new Error('network'));
    await expect(
      gateway.verifyTokenAndGetProfile('facebook', 'token'),
    ).rejects.toThrow('Error validating Facebook token');
  });

  it('rejects unsupported providers defensively', async () => {
    const gateway = new OAuthValidationGatewayImpl(
      'google',
      'facebook',
      'secret',
      googleClient(undefined),
    );
    await expect(
      gateway.verifyTokenAndGetProfile('github' as 'google', 'token'),
    ).rejects.toThrow('Unsupported OAuth provider');
  });
});
