// test/auth-controllers.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { ILoginInputPort } from '../src/2_use_cases/auth/login_manual/ILoginInputPort';
import { ILoginOAuthInputPort } from '../src/2_use_cases/auth/login_oauth/ILoginOAuthInputPort';
import { RefreshTokenService } from '../src/2_use_cases/auth/refresh/RefreshTokenService';
import { IRegisterManualInputPort } from '../src/2_use_cases/auth/register_manual/IRegisterManualInputPort';
import { IGetProfilePictureInputPort } from '../src/2_use_cases/auth/get_profile_picture/IGetProfilePictureInputPort';
import { GetProfilePictureResponse } from '../src/2_use_cases/auth/get_profile_picture/GetProfilePictureResponse';
import { IUpdateProfilePictureInputPort } from '../src/2_use_cases/auth/update_profile_picture/IUpdateProfilePictureInputPort';
import { IUpdateUserInputPort } from '../src/2_use_cases/auth/update_user/IUpdateUserInputPort';
import { AuthController } from '../src/3_interface_adapters/controllers/auth/AuthController';
import { ProfilePictureController } from '../src/3_interface_adapters/controllers/auth/ProfilePictureController';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '../src/3_interface_adapters/controllers/auth/guards/JwtAuthGuard';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const request = (ip?: string, userAgent?: string, cookie?: string): Request =>
  ({
    ip,
    headers: { ...(cookie && { cookie }) },
    get: mock<Request['get']>().mockReturnValue(userAgent),
  }) as unknown as Request;

const response = () => {
  const cookie = mock<Response['cookie']>();
  return { value: { cookie } as unknown as Response, cookie };
};

const createController = () => {
  const login: jest.Mocked<ILoginInputPort> = {
    execute: mock<ILoginInputPort['execute']>(),
  };
  const register: jest.Mocked<IRegisterManualInputPort> = {
    execute: mock<IRegisterManualInputPort['execute']>(),
  };
  const oauth: jest.Mocked<ILoginOAuthInputPort> = {
    execute: mock<ILoginOAuthInputPort['execute']>(),
  };
  const refresh = {
    refresh: mock<RefreshTokenService['refresh']>(),
  } as unknown as RefreshTokenService;
  const update: jest.Mocked<IUpdateUserInputPort> = {
    execute: mock<IUpdateUserInputPort['execute']>(),
  };
  return {
    controller: new AuthController(login, register, oauth, refresh, update),
    login,
    register,
    oauth,
    refresh,
    update,
  };
};

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

describe('AuthController', () => {
  it('maps successful manual login and sets the secure refresh cookie', async () => {
    const fixture = createController();
    const res = response();
    fixture.login.execute.mockResolvedValue({
      status: 'success',
      data: {
        token: 'access',
        refreshToken: 'refresh',
        user_name: 'Cesar',
      },
    });

    await expect(
      fixture.controller.login(
        { email: 'user@example.com', password: 'Password1!' },
        request('127.0.0.1', 'agent'),
        res.value,
      ),
    ).resolves.toEqual({
      status: 'success',
      data: { token: 'access', user_name: 'Cesar' },
    });
    expect(fixture.login.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        plainPassword: 'Password1!',
        ip: '127.0.0.1',
        userAgent: 'agent',
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh',
      cookieOptions,
    );
  });

  it('uses unknown request metadata and rejects failed login', async () => {
    const fixture = createController();
    fixture.login.execute.mockResolvedValue({
      status: 'error',
      message: 'Invalid credentials',
    });

    await expect(
      fixture.controller.login(
        { email: 'user@example.com', password: 'bad' },
        request(),
        response().value,
      ),
    ).rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
    expect(fixture.login.execute).toHaveBeenCalledWith(
      expect.objectContaining({ ip: 'unknown', userAgent: 'unknown' }),
    );
  });

  it('maps registration success and failure', async () => {
    const fixture = createController();
    const success = {
      status: 'success' as const,
      data: { id: 'user-1', email: 'user@example.com', user_name: 'Cesar' },
    };
    fixture.register.execute.mockResolvedValueOnce(success);
    const body = {
      email: 'user@example.com',
      password: 'Password1!',
      firstName: 'Cesar',
      lastName: 'Developer',
    };

    await expect(fixture.controller.register(body)).resolves.toBe(success);
    expect(fixture.register.execute).toHaveBeenCalledWith(body);

    fixture.register.execute.mockResolvedValueOnce({
      status: 'error',
      message: 'Email is already registered',
    });
    await expect(fixture.controller.register(body)).rejects.toMatchObject({
      status: 400,
      message: 'Email is already registered',
    });
  });

  it('maps OAuth login and secure cookie data', async () => {
    const fixture = createController();
    const res = response();
    fixture.oauth.execute.mockResolvedValue({
      status: 'success',
      data: {
        token: 'oauth-access',
        refreshToken: 'oauth-refresh',
        user_name: 'OAuth User',
        is_new_user: true,
      },
    });

    await expect(
      fixture.controller.loginOAuth(
        { providerName: 'google', token: 'provider-token' },
        request(undefined, undefined),
        res.value,
      ),
    ).resolves.toEqual({
      status: 'success',
      data: {
        token: 'oauth-access',
        user_name: 'OAuth User',
        is_new_user: true,
      },
    });
    expect(fixture.oauth.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        providerName: 'google',
        token: 'provider-token',
        ip: 'unknown',
        userAgent: 'unknown',
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'oauth-refresh',
      cookieOptions,
    );
  });

  it('refreshes an encoded cookie and maps refresh failures', async () => {
    const fixture = createController();
    const res = response();
    const refresh = fixture.refresh.refresh as jest.MockedFunction<
      RefreshTokenService['refresh']
    >;
    refresh.mockResolvedValueOnce({
      accessToken: 'new-access',
      refreshToken: 'new refresh',
      expiresAt: new Date(),
    });

    await expect(
      fixture.controller.refresh(
        request('127.0.0.1', 'agent', 'other=x; refresh_token=old%20refresh'),
        res.value,
      ),
    ).resolves.toEqual({ status: 'success', data: { token: 'new-access' } });
    expect(refresh).toHaveBeenCalledWith({
      token: 'old refresh',
      ip: '127.0.0.1',
      userAgent: 'agent',
    });

    refresh.mockRejectedValueOnce(new Error('Invalid refresh token context'));
    await expect(
      fixture.controller.refresh(request(), response().value),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid refresh token context',
    });
    refresh.mockRejectedValueOnce('failure');
    await expect(
      fixture.controller.refresh(request(), response().value),
    ).rejects.toMatchObject({ status: 401, message: 'Unauthorized' });
  });

  it('maps authenticated updates and rejects update errors', async () => {
    const fixture = createController();
    const req = {
      user: { userId: 'user-1', email: 'old@example.com' },
    } as AuthenticatedRequest;
    const success = {
      status: 'success' as const,
      data: {
        id: 'user-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: null,
      },
    };
    fixture.update.execute.mockResolvedValueOnce(success);

    await expect(
      fixture.controller.updateMe(
        { email: 'new@example.com', firstName: 'New', lastName: null },
        req,
      ),
    ).resolves.toBe(success);
    expect(fixture.update.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'new@example.com',
      firstName: 'New',
      lastName: null,
    });

    fixture.update.execute.mockResolvedValueOnce({
      status: 'error',
      message: 'duplicate',
    });
    await expect(fixture.controller.updateMe({}, req)).rejects.toMatchObject({
      status: 400,
      message: 'duplicate',
    });
  });
});

describe('ProfilePictureController and JwtAuthGuard', () => {
  it('maps uploads and downloads for the authenticated user', async () => {
    const update: jest.Mocked<IUpdateProfilePictureInputPort> = {
      execute: mock<
        IUpdateProfilePictureInputPort['execute']
      >().mockResolvedValue({
        status: 'success',
      }),
    };
    const image = Buffer.from('image');
    const get: jest.Mocked<IGetProfilePictureInputPort> = {
      execute: mock<IGetProfilePictureInputPort['execute']>().mockResolvedValue(
        new GetProfilePictureResponse(
          image,
          'user-1-profile.jpg',
          'image/jpeg',
        ),
      ),
    };
    const controller = new ProfilePictureController(update, get);
    const req = {
      user: { userId: 'user-1', email: 'user@example.com' },
    } as AuthenticatedRequest;
    const file = { buffer: Buffer.from('upload') } as Express.Multer.File;

    await expect(controller.uploadFile(req, file)).resolves.toEqual({
      status: 'success',
    });
    expect(update.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', fileBuffer: file.buffer }),
    );

    const set = mock<Response['set']>();
    const send = mock<Response['send']>();
    await controller.getProfilePicture(req, {
      set,
      send,
    } as unknown as Response);
    expect(get.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(set).toHaveBeenCalledWith({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline; filename="User-foto.jpg"',
    });
    expect(send).toHaveBeenCalledWith(image);
  });

  it('allows a valid bearer token and assigns its identity', () => {
    const secret = process.env.JWT_SECRET || 'super_secreto_de_respaldo';
    const token = jwt.sign(
      { sub: 'user-1', email: 'user@example.com' },
      secret,
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    expect(new JwtAuthGuard().canActivate(context)).toBe(true);
    expect(req.user).toEqual({
      userId: 'user-1',
      email: 'user@example.com',
    });
  });

  it.each([
    [undefined, 'An access token is required'],
    ['Basic credentials', 'An access token is required'],
    ['Bearer invalid', 'The token is invalid or expired'],
  ])('rejects invalid authorization %s', (authorization, message) => {
    const req = { headers: { authorization } } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;
    expect(() => new JwtAuthGuard().canActivate(context)).toThrow(message);
  });

  it('rejects signed tokens without the required claims', () => {
    const token = jwt.sign(
      { sub: 123 },
      process.env.JWT_SECRET || 'super_secreto_de_respaldo',
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    expect(() => new JwtAuthGuard().canActivate(context)).toThrow(
      'The token is invalid or expired',
    );
  });
});
