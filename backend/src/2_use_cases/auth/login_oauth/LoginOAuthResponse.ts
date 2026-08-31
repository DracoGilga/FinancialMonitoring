// src/2_use_cases/auth/login_oauth/LoginOAuthResponse.ts
export class LoginOAuthResponse {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly userFirstName: string,
    public readonly isNewUser: boolean,
  ) {}
}
