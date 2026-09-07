// test/profile-picture.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { ProfilePictureController } from '../src/3_interface_adapters/controllers/auth/ProfilePictureController';
import { IUpdateProfilePictureInputPort } from '../src/2_use_cases/auth/update_profile_picture/IUpdateProfilePictureInputPort';
import { IGetProfilePictureInputPort } from '../src/2_use_cases/auth/get_profile_picture/IGetProfilePictureInputPort';
import { GetProfilePictureResponse } from '../src/2_use_cases/auth/get_profile_picture/GetProfilePictureResponse';
import { AuthenticatedRequest } from '../src/3_interface_adapters/controllers/auth/guards/JwtAuthGuard';
import { JwtAuthGuard } from '../src/3_interface_adapters/controllers/auth/guards/JwtAuthGuard';
import * as jwt from 'jsonwebtoken';
import type { Response } from 'express';

describe('ProfilePictureController', () => {
  it('uploads the picture for the authenticated token user only', async () => {
    const updateProfilePictureUseCase = {
      execute: jest
        .fn<IUpdateProfilePictureInputPort['execute']>()
        .mockResolvedValue({}),
    };
    const getProfilePictureUseCase = {
      execute: jest.fn<IGetProfilePictureInputPort['execute']>(),
    };
    const controller = new ProfilePictureController(
      updateProfilePictureUseCase,
      getProfilePictureUseCase,
    );
    const request = {
      user: { userId: 'owner-1', email: 'owner@example.com' },
    } as AuthenticatedRequest;

    await controller.uploadFile(request, {
      buffer: Buffer.from('safe-image'),
    } as Express.Multer.File);

    expect(updateProfilePictureUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1' }),
    );
    expect(updateProfilePictureUseCase.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'another-user' }),
    );
  });

  it('gets only the authenticated user profile picture', async () => {
    const updateProfilePictureUseCase = {
      execute: jest.fn<IUpdateProfilePictureInputPort['execute']>(),
    };
    const getProfilePictureUseCase: jest.Mocked<IGetProfilePictureInputPort> = {
      execute: jest
        .fn<IGetProfilePictureInputPort['execute']>()
        .mockResolvedValue(
          new GetProfilePictureResponse(
            Buffer.from('image'),
            'owner-1-profile.jpg',
            'image/jpeg',
          ),
        ),
    };
    const controller = new ProfilePictureController(
      updateProfilePictureUseCase,
      getProfilePictureUseCase,
    );
    const response = {
      set: jest.fn(),
      send: jest.fn(),
    };
    const request = {
      user: { userId: 'owner-1', email: 'owner@example.com' },
    } as AuthenticatedRequest;

    await controller.getProfilePicture(
      request,
      response as unknown as Response,
    );

    expect(getProfilePictureUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1' }),
    );
    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline; filename="User-foto.jpg"',
    });
    expect(response.send).toHaveBeenCalledWith(Buffer.from('image'));
  });

  it('rejects requests without an access token', () => {
    const guard = new JwtAuthGuard();
    const request = { headers: {} } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(
      'An access token is required',
    );
  });

  it('gets the authenticated user id from a valid access token', () => {
    const guard = new JwtAuthGuard();
    const token = jwt.sign(
      { sub: 'owner-1', email: 'owner@example.com' },
      process.env.JWT_SECRET || 'super_secreto_de_respaldo',
    );
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
    expect(request.user).toEqual({
      userId: 'owner-1',
      email: 'owner@example.com',
    });
  });
});
