// src/3_interface_adapters/presenters/auth/UpdateUserPresenter.ts
import {
  IUpdateUserOutputPort,
  UpdateUserErrorViewModel,
  UpdateUserSuccessViewModel,
} from '../../../2_use_cases/auth/update_user/IUpdateUserOutputPort';
import { UpdateUserResponse } from '../../../2_use_cases/auth/update_user/UpdateUserResponse';

export class UpdateUserPresenter implements IUpdateUserOutputPort {
  presentSuccess(response: UpdateUserResponse): UpdateUserSuccessViewModel {
    return { status: 'success', data: response };
  }

  presentError(error: Error): UpdateUserErrorViewModel {
    return { status: 'error', message: error.message };
  }
}
