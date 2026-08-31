// src/2_use_cases/auth/login_oauth/ILoginOAuthInputPort.ts
import { LoginOAuthRequest } from './LoginOAuthRequest';
import { LoginOAuthViewModel } from './ILoginOAuthOutputPort';

export interface ILoginOAuthInputPort {
  execute(request: LoginOAuthRequest): Promise<LoginOAuthViewModel>;
}
