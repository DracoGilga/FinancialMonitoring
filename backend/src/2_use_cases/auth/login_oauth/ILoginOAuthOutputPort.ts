// src/2_use_cases/auth/login_oauth/ILoginOAuthOutputPort.ts
import { LoginOAuthResponse } from './LoginOAuthResponse';
export interface LoginOAuthViewModel {
  status: 'success';
  data: {
    token: string;
    refreshToken: string;
    user_name: string;
    is_new_user: boolean;
  };
}

export interface ILoginOAuthOutputPort {
  presentSuccess(response: LoginOAuthResponse): LoginOAuthViewModel;
  presentError(error: Error): never;
}
