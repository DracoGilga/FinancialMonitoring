// src/3_interface_adapters/presenters/auth/GetProfilePicturePresenter.ts
import { Injectable } from '@nestjs/common';
import { IGetProfilePictureOutputPort } from '../../../2_use_cases/auth/get_profile_picture/IGetProfilePictureOutputPort';
import { GetProfilePictureResponse } from '../../../2_use_cases/auth/get_profile_picture/GetProfilePictureResponse';

@Injectable()
export class GetProfilePicturePresenter implements IGetProfilePictureOutputPort {
  presentSuccess(
    response: GetProfilePictureResponse,
  ): GetProfilePictureResponse {
    return response;
  }

  presentError(error: Error): never {
    throw error;
  }
}
