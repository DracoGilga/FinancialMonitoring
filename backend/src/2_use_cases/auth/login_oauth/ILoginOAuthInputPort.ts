// src/2_use_cases/auth/login_oauth/ILoginOAuthInputPort.ts
import { LoginOAuthRequest } from './LoginOAuthRequest';

export interface ILoginOAuthInputPort {
  execute(request: LoginOAuthRequest): Promise<void>;
}
