// src/2_use_cases/auth/login_oauth/LoginOAuthResponse.ts
export class LoginOAuthResponse {
  constructor(
    public readonly sessionId: string,
    public readonly userFirstName: string,
    public readonly isNewUser: boolean,
  ) {}
}
