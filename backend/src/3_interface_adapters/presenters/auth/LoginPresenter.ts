// src/3_interface_adapters/presenters/auth/LoginPresenter.ts
import {
  ILoginOutputPort,
  LoginSuccessViewModel,
  LoginErrorViewModel,
} from '../../../2_use_cases/auth/login_manual/ILoginOutputPort';
import { LoginManualResponse } from '../../../2_use_cases/auth/login_manual/LoginManualResponse';

export class LoginPresenter implements ILoginOutputPort {
  presentSuccess(response: LoginManualResponse): LoginSuccessViewModel {
    return {
      status: 'success',
      data: {
        token: response.accessToken,
        refresh_token: response.refreshToken, // <-- NUEVO
        user_name: response.firstName,
      },
    };
  }

  public presentError(error: Error): LoginErrorViewModel {
    return {
      status: 'error',
      message: error.message,
    };
  }
}
