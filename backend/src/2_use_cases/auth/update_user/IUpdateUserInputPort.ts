// src/2_use_cases/auth/update_user/IUpdateUserInputPort.ts
import { UpdateUserRequest } from './UpdateUserRequest';
import { UpdateUserResultViewModel } from './IUpdateUserOutputPort';

export interface IUpdateUserInputPort {
  execute(request: UpdateUserRequest): Promise<UpdateUserResultViewModel>;
}
