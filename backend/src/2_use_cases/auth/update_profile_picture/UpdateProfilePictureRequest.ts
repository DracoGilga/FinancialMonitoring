// src/2_use_cases/auth/update_profile_picture/UpdateProfilePictureRequest.ts
export class UpdateProfilePictureRequest {
  constructor(
    public readonly userId: string,
    public readonly fileBuffer: Buffer,
  ) {}
}
