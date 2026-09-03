// src/3_interface_adapters/gateways/auth/OAuthValidationGatewayImpl.ts
import {
  IOAuthValidationGateway,
  OAuthProfile,
} from '../../../2_use_cases/auth/login_oauth/IOAuthValidationGateway';
import { OAuth2Client } from 'google-auth-library';

export class OAuthValidationGatewayImpl implements IOAuthValidationGateway {
  private googleClient: OAuth2Client;

  constructor(
    private readonly googleClientId: string,
    private readonly facebookAppId: string,
    private readonly facebookAppSecret: string,
  ) {
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
      return this.verifyFacebookToken(token);
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
    } catch {
      throw new Error('Error validating Google token');
    }
  }

  private async verifyFacebookToken(token: string): Promise<OAuthProfile> {
    try {
      const appAccessToken = `${this.facebookAppId}|${this.facebookAppSecret}`;
      const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appAccessToken}`;

      const debugResponse = await fetch(debugTokenUrl);
      const debugData = (await debugResponse.json()) as {
        data?: { error?: unknown; app_id?: string };
      };

      if (!debugResponse.ok || debugData.data?.error) {
        throw new Error('The Facebook token is invalid or expired');
      }

      if (debugData.data?.app_id !== this.facebookAppId) {
        throw new Error(
          'Security Breach: The token belongs to a different application',
        );
      }

      const url = `https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${token}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        id?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
      };

      if (!data.email || !data.id) {
        throw new Error(
          'The Facebook token does not contain the email address',
        );
      }

      return {
        providerId: data.id,
        email: data.email,
        firstName: data.first_name || 'Usuario',
        lastName: data.last_name || null,
      };
    } catch (error) {
      if (
        (error instanceof Error && error.message.includes('Facebook')) ||
        (error instanceof Error && error.message.includes('Security'))
      ) {
        throw error;
      }
      throw new Error('Error validating Facebook token');
    }
  }
}
