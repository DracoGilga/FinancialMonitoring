// src/2_use_cases/auth/login_oauth/LoginOAuthRequest.ts
export class LoginOAuthRequest {
  constructor(
    public readonly providerName: 'google' | 'facebook',
    public readonly token: string,
  ) {}
}
