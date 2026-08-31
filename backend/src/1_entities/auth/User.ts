// src/1:ebtutues/auth/User.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string | null,
    public readonly isActive: boolean,
    private readonly passwordHash: string | null,
  ) {}

  public isOAuthUser(): boolean {
    return this.passwordHash === null;
  }

  public canLogin(): boolean {
    return this.isActive === true;
  }

  public hasValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  public getPasswordHash(): string | null {
    return this.passwordHash;
  }
}
