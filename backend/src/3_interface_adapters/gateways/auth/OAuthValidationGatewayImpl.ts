// src/3_interface_adapters/gateways/auth/OAuthValidationGatewayImpl.ts
import {
  IOAuthValidationGateway,
  OAuthProfile,
} from '../../../2_use_cases/auth/login_oauth/IOAuthValidationGateway';
import { OAuth2Client } from 'google-auth-library';

export class OAuthValidationGatewayImpl implements IOAuthValidationGateway {
  private googleClient: OAuth2Client;

  constructor(private readonly googleClientId: string) {
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  public async verifyTokenAndGetProfile(
    providerName: 'google' | 'facebook',
    token: string,
  ): Promise<OAuthProfile> {
    if (providerName === 'google') {
      return this.verifyGoogleToken(token);
    }

    if (providerName === 'facebook') {
      throw new Error('Facebook login is not implemented yet');
    }

    throw new Error('Unsupported OAuth provider');
  }

  private async verifyGoogleToken(token: string): Promise<OAuthProfile> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.googleClientId,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email || !payload.sub) {
        throw new Error(
          'The Google token does not contain the necessary information',
        );
      }

      return {
        providerId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || 'Usuario',
        lastName: payload.family_name || null,
      };
    } catch (error) {
      throw new Error('The Google token is invalid or expired');
    }
  }
}
