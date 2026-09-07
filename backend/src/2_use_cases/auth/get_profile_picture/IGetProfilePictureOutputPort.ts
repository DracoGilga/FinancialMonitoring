// src/2_use_cases/auth/get_profile_picture/IGetProfilePictureOutputPort.ts
import { GetProfilePictureResponse } from './GetProfilePictureResponse';

export interface IGetProfilePictureOutputPort {
  presentSuccess(
    response: GetProfilePictureResponse,
  ): GetProfilePictureResponse;
  presentError(error: Error): never;
}
