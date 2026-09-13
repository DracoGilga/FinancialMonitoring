// test/auth-security-utils.spec.ts
import { describe, expect, it } from '@jest/globals';
import { OAuthAccount } from '../src/1_entities/auth/OAuthAccount';
import { Session } from '../src/1_entities/auth/Session';
import { User } from '../src/1_entities/auth/User';
import { GetProfilePictureResponse } from '../src/2_use_cases/auth/get_profile_picture/GetProfilePictureResponse';
import { LoginManualResponse } from '../src/2_use_cases/auth/login_manual/LoginManualResponse';
import { LoginOAuthResponse } from '../src/2_use_cases/auth/login_oauth/LoginOAuthResponse';
import * as jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { BcryptPasswordHasher } from '../src/3_interface_adapters/gateways/auth/BcryptPasswordHasher';
import { JwtTokenGenerator } from '../src/3_interface_adapters/gateways/auth/JwtTokenGenerator';
import { SharpImageProcessorImpl } from '../src/3_interface_adapters/gateways/auth/SharpImageProcessorImpl';
import { SecureRefreshTokenGenerator } from '../src/3_interface_adapters/gateways/auth/SecureRefreshTokenGenerator';
import { GetProfilePicturePresenter } from '../src/3_interface_adapters/presenters/auth/GetProfilePicturePresenter';
import { LoginOAuthPresenter } from '../src/3_interface_adapters/presenters/auth/LoginOAuthPresenter';
import { LoginPresenter } from '../src/3_interface_adapters/presenters/auth/LoginPresenter';
import { RegisterPresenter } from '../src/3_interface_adapters/presenters/auth/RegisterPresenter';

const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('BcryptPasswordHasher', () => {
  it('creates salted hashes and compares valid and invalid passwords', async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash('Password1!');

    expect(hash).not.toBe('Password1!');
    expect(hash.startsWith('$2')).toBe(true);
    await expect(hasher.compare('Password1!', hash)).resolves.toBe(true);
    await expect(hasher.compare('WrongPassword1!', hash)).resolves.toBe(false);
  });
});

describe('JwtTokenGenerator', () => {
  it('signs verifiable tokens with identity and expiration claims', () => {
    const generator = new JwtTokenGenerator('test-secret', 15);
    const token = generator.generateAccessToken('user-1', 'user@example.com');
    const payload = jwt.verify(token, 'test-secret');

    expect(typeof payload).not.toBe('string');
    if (typeof payload === 'string') throw new Error('Expected JWT payload');
    expect(payload).toMatchObject({
      sub: 'user-1',
      email: 'user@example.com',
    });
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(15 * 60);
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });
});

describe('auth entities, refresh tokens and presenters', () => {
  it('covers entity security rules', () => {
    expect(
      new User(
        '1',
        'valid@example.com',
        'User',
        null,
        true,
        null,
      ).isOAuthUser(),
    ).toBe(true);
    expect(
      new User('1', 'invalid', 'User', null, false, 'hash').hasValidEmail(),
    ).toBe(false);
    expect(new OAuthAccount('1', 'google', 'provider').isValidProvider()).toBe(
      true,
    );
    expect(new Session('1', 'user', new Date(Date.now() - 1)).isExpired()).toBe(
      true,
    );
  });

  it('generates random refresh tokens and stable hashes', () => {
    const generator = new SecureRefreshTokenGenerator();
    const first = generator.generate();
    const second = generator.generate();
    expect(first).not.toBe(second);
    expect(generator.hash(first)).toHaveLength(64);
    expect(generator.hash(first)).toBe(generator.hash(first));
  });

  it('maps login, registration and profile-picture presentation', () => {
    expect(
      new LoginPresenter().presentSuccess(
        new LoginManualResponse('access', 'refresh', 'User'),
      ),
    ).toEqual({
      status: 'success',
      data: { token: 'access', refreshToken: 'refresh', user_name: 'User' },
    });
    expect(new LoginPresenter().presentError(new Error('failed'))).toEqual({
      status: 'error',
      message: 'failed',
    });

    expect(
      new LoginOAuthPresenter().presentSuccess(
        new LoginOAuthResponse('access', 'refresh', 'User', true),
      ),
    ).toEqual({
      status: 'success',
      data: {
        token: 'access',
        refreshToken: 'refresh',
        user_name: 'User',
        is_new_user: true,
      },
    });
    expect(() =>
      new LoginOAuthPresenter().presentError(
        new Error('The user is not registered'),
      ),
    ).toThrow(expect.objectContaining({ status: 403 }));
    expect(() =>
      new LoginOAuthPresenter().presentError(
        new Error('The google token is invalid or expired'),
      ),
    ).toThrow(expect.objectContaining({ status: 401 }));
    expect(() =>
      new LoginOAuthPresenter().presentError(new Error('provider failed')),
    ).toThrow(expect.objectContaining({ status: 500 }));

    const register = new RegisterPresenter();
    expect(
      register.presentSuccess({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'User',
        lastName: null,
      }),
    ).toEqual({
      status: 'success',
      data: {
        id: 'user-1',
        email: 'user@example.com',
        user_name: 'User',
      },
    });
    expect(() => register.presentError(new Error('invalid'))).toThrow(
      expect.objectContaining({ status: 400 }),
    );

    const picture = new GetProfilePictureResponse(
      Buffer.from('image'),
      'photo.jpg',
      'image/jpeg',
    );
    const picturePresenter = new GetProfilePicturePresenter();
    expect(picturePresenter.presentSuccess(picture)).toBe(picture);
    expect(() => picturePresenter.presentError(new Error('missing'))).toThrow(
      'missing',
    );
  });
});

describe('SharpImageProcessorImpl', () => {
  it('sanitizes PNG and JPEG input into normalized JPEG output', async () => {
    const processor = new SharpImageProcessorImpl();
    const jpeg = await sharp(validPng).jpeg().toBuffer();

    for (const input of [validPng, jpeg]) {
      const result = await processor.sanitizeAndProcess(input);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(result.subarray(0, 3).toString('hex')).toBe('ffd8ff');
    }
  });

  it.each([
    ['text', Buffer.from('not an image')],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['empty input', Buffer.alloc(0)],
  ])('rejects invalid or unsupported %s', async (_name, input) => {
    await expect(
      new SharpImageProcessorImpl().sanitizeAndProcess(input),
    ).rejects.toMatchObject({
      status: 400,
      message: 'The provided file is not a valid image or is corrupted.',
    });
  });
});
