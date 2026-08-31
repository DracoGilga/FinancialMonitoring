// src/2_use_cases/auth/login_manual/LoginManualResponse.ts
export class LoginManualResponse {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly firstName: string,
  ) {}
}
