// src/2_use_cases/auth/get_profile_picture/IGetProfilePictureInputPort.ts
import { GetProfilePictureRequest } from './GetProfilePictureRequest';
import { GetProfilePictureResponse } from './GetProfilePictureResponse';

export interface IGetProfilePictureInputPort {
  execute(
    request: GetProfilePictureRequest,
  ): Promise<GetProfilePictureResponse>;
}
