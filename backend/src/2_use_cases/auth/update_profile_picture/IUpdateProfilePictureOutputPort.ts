// src/2_use_cases/auth/update_profile_picture/IUpdateProfilePictureOutputPort.ts
import { UpdateProfilePictureResponse } from './UpdateProfilePictureResponse';

export interface IUpdateProfilePictureOutputPort {
  presentSuccess(response: UpdateProfilePictureResponse): unknown;
  presentError(error: Error): unknown;
}
