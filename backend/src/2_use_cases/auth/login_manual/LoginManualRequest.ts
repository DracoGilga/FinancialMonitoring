// src/2_use_cases/auth/login_manual/LoginManualRequest.ts
export class LoginManualRequest {
  constructor(
    public readonly email: string,
    public readonly plainPassword: string,
  ) {}
}
