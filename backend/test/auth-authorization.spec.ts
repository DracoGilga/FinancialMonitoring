// test/auth-authorization.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { AuthController } from '../src/3_interface_adapters/controllers/auth/AuthController';
import { RefreshTokenService } from '../src/2_use_cases/auth/refresh/RefreshTokenService';
import { ILoginInputPort } from '../src/2_use_cases/auth/login_manual/ILoginInputPort';
import { IRegisterManualInputPort } from '../src/2_use_cases/auth/register_manual/IRegisterManualInputPort';
import { ILoginOAuthInputPort } from '../src/2_use_cases/auth/login_oauth/ILoginOAuthInputPort';
import { IUpdateUserInputPort } from '../src/2_use_cases/auth/update_user/IUpdateUserInputPort';
import { UpdateUserDto } from '../src/3_interface_adapters/controllers/auth/dto/UpdateUserDto';
import { AuthenticatedRequest } from '../src/3_interface_adapters/controllers/auth/guards/JwtAuthGuard';

describe('profile update authorization', () => {
  it('uses the user id from the JWT instead of a user id supplied by the client', async () => {
    const updateUserUseCase: jest.Mocked<IUpdateUserInputPort> = {
      execute: jest.fn<IUpdateUserInputPort['execute']>().mockResolvedValue({
        status: 'success',
        data: {
          id: 'owner-1',
          email: 'owner@example.com',
          firstName: 'Owner',
          lastName: null,
        },
      }),
    };
    const controller = new AuthController(
      {} as ILoginInputPort,
      {} as IRegisterManualInputPort,
      {} as ILoginOAuthInputPort,
      {} as RefreshTokenService,
      updateUserUseCase,
    );
    const body = Object.assign(new UpdateUserDto(), {
      firstName: 'Updated',
      userId: 'another-user',
    });
    const request = {
      user: { userId: 'owner-1', email: 'owner@example.com' },
    } as AuthenticatedRequest;

    await controller.updateMe(body, request);

    expect(updateUserUseCase.execute).toHaveBeenCalledWith({
      userId: 'owner-1',
      email: undefined,
      firstName: 'Updated',
      lastName: undefined,
    });
  });
});
