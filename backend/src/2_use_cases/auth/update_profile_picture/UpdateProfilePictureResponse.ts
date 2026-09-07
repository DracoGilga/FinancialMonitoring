// src/2_use_cases/auth/update_profile_picture/UpdateProfilePictureResponse.ts
export class UpdateProfilePictureResponse {
  constructor(
    public readonly fileName: string,
    public readonly success: boolean = true,
  ) {}
}
