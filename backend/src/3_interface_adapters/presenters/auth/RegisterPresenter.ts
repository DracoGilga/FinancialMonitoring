// src/3_interface_adapters/presenters/auth/RegisterPresenter.ts
import {
  IRegisterManualOutputPort,
  RegisterSuccessViewModel,
  RegisterErrorViewModel,
} from '../../../2_use_cases/auth/register_manual/IRegisterManualOutputPort';
import { RegisterManualResponse } from '../../../2_use_cases/auth/register_manual/RegisterManualResponse';
import { HttpException, HttpStatus } from '@nestjs/common';

export class RegisterPresenter implements IRegisterManualOutputPort {
  presentSuccess(response: RegisterManualResponse): RegisterSuccessViewModel {
    return {
      status: 'success',
      data: {
        id: response.id,
        email: response.email,
        user_name: response.firstName,
      },
    };
  }

  presentError(error: Error): RegisterErrorViewModel {
    throw new HttpException(
      {
        status: 'error',
        message: error.message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
