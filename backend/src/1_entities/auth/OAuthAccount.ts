// src/1_entities/auth/OAuthAccount.ts
export class OAuthAccount {
  constructor(
    public readonly userId: string,
    public readonly providerName: 'google' | 'facebook',
    public readonly providerId: string,
  ) {}

  public isValidProvider(): boolean {
    return ['google', 'facebook'].includes(this.providerName);
  }
}
