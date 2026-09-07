// src/2_use_cases/auth/update_profile_picture/IUpdateProfilePictureInputPort.ts
import { UpdateProfilePictureRequest } from './UpdateProfilePictureRequest';

export interface IUpdateProfilePictureInputPort {
  execute(request: UpdateProfilePictureRequest): Promise<unknown>;
}
