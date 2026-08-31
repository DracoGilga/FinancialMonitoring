// src/2_use_cases/auth/login_manual/LoginManualResponse.ts
export class LoginManualResponse {
  constructor(
    public readonly sessionId: string,
    public readonly userFirstName: string,
  ) {}
}
