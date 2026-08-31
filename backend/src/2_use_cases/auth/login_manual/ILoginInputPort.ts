// src/2_use_cases/auth/login_manual/ILoginInputPort.ts
import { LoginManualRequest } from './LoginManualRequest';
import { LoginResultViewModel } from './ILoginOutputPort';

export interface ILoginInputPort {
  execute(request: LoginManualRequest): Promise<LoginResultViewModel>;
}
