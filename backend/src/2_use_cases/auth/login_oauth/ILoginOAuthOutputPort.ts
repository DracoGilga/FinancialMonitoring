// src/2_use_cases/auth/login_oauth/ILoginOAuthOutputPort.ts
import { LoginOAuthResponse } from './LoginOAuthResponse';

export interface ILoginOAuthOutputPort {
  presentSuccess(response: LoginOAuthResponse): void;
  presentError(error: Error): void;
}
