// src/2_use_cases/auth/update_user/IUpdateUserOutputPort.ts
import { UpdateUserResponse } from './UpdateUserResponse';

export interface UpdateUserSuccessViewModel {
  status: 'success';
  data: UpdateUserResponse;
}

export interface UpdateUserErrorViewModel {
  status: 'error';
  message: string;
}

export type UpdateUserResultViewModel =
  UpdateUserSuccessViewModel | UpdateUserErrorViewModel;

export interface IUpdateUserOutputPort {
  presentSuccess(response: UpdateUserResponse): UpdateUserSuccessViewModel;
  presentError(error: Error): UpdateUserErrorViewModel;
}
