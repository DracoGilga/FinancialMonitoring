// src/1:ebtutues/auth/Session.ts
export class Session {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly expiresAt: Date,
  ) {}

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
