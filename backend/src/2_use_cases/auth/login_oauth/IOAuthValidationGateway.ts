// src/2_use_cases/auth/login_oauth/IOAuthValidationGateway.ts
export interface OAuthProfile {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

export interface IOAuthValidationGateway {
  verifyTokenAndGetProfile(
    providerName: 'google' | 'facebook',
    token: string,
  ): Promise<OAuthProfile>;
}
