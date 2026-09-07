// src/3_interface_adapters/presenters/auth/UpdateProfilePicturePresenter.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IUpdateProfilePictureOutputPort } from '../../../2_use_cases/auth/update_profile_picture/IUpdateProfilePictureOutputPort';
import { UpdateProfilePictureResponse } from '../../../2_use_cases/auth/update_profile_picture/UpdateProfilePictureResponse';

@Injectable()
export class UpdateProfilePicturePresenter implements IUpdateProfilePictureOutputPort {
  presentSuccess(response: UpdateProfilePictureResponse) {
    return {
      message: 'Profile picture updated successfully',
      data: {
        fileName: response.fileName,
      },
    };
  }

  presentError(error: Error) {
    throw new InternalServerErrorException(error.message);
  }
}
