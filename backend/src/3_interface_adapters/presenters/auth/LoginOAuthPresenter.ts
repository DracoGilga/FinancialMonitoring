import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ILoginOAuthOutputPort,
  LoginOAuthViewModel,
} from '../../../2_use_cases/auth/login_oauth/ILoginOAuthOutputPort';
import { LoginOAuthResponse } from '../../../2_use_cases/auth/login_oauth/LoginOAuthResponse';

export class LoginOAuthPresenter implements ILoginOAuthOutputPort {
  presentSuccess(response: LoginOAuthResponse): LoginOAuthViewModel {
    return {
      status: 'success',
      data: {
        token: response.accessToken,
        refresh_token: response.refreshToken,
        user_name: response.userFirstName,
        is_new_user: response.isNewUser,
      },
    };
  }

  presentError(error: Error): never {
    if (error.message === 'The user is not registered') {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
    if (error.message === 'The google token is invalid or expired') {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
    throw new HttpException(
      'External provider authentication error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
