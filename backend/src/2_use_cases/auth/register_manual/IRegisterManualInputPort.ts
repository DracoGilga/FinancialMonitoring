// src/2_use_cases/auth/register_manual/IRegisterManualInputPort.ts
import { RegisterManualRequest } from './RegisterManualRequest';
import { RegisterResultViewModel } from './IRegisterManualOutputPort';

export interface IRegisterManualInputPort {
  execute(request: RegisterManualRequest): Promise<RegisterResultViewModel>;
}
