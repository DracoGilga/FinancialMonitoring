// src/2_use_cases/auth/get_profile_picture/GetProfilePictureResponse.ts
export class GetProfilePictureResponse {
  constructor(
    public readonly fileBuffer: Buffer,
    public readonly fileName: string,
    public readonly contentType: string,
  ) {}
}
