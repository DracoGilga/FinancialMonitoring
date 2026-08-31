// src/2_use_cases/auth/register_manual/IRegisterManualOutputPort.ts
import { RegisterManualResponse } from './RegisterManualResponse';

export interface RegisterSuccessViewModel {
  status: 'success';
  data: {
    id: string;
    email: string;
    user_name: string;
  };
}

export interface RegisterErrorViewModel {
  status: 'error';
  message: string;
}

export type RegisterResultViewModel =
  RegisterSuccessViewModel | RegisterErrorViewModel;

export interface IRegisterManualOutputPort {
  presentSuccess(response: RegisterManualResponse): RegisterSuccessViewModel;
  presentError(error: Error): RegisterErrorViewModel;
}
