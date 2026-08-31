// src/2_use_cases/auth/login_manual/ILoginOutputPort.ts
import { LoginManualResponse } from './LoginManualResponse';

export interface LoginSuccessViewModel {
  status: 'success';
  data: {
    token: string;
    refresh_token: string;
    user_name: string;
  };
}

export interface LoginErrorViewModel {
  status: 'error';
  message: string;
}

export type LoginResultViewModel = LoginSuccessViewModel | LoginErrorViewModel;

export interface ILoginOutputPort {
  presentSuccess(response: LoginManualResponse): LoginSuccessViewModel;
  presentError(error: Error): LoginErrorViewModel;
}
