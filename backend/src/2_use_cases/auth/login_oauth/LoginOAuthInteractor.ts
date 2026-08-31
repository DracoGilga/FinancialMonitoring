// src/2_use_cases/auth/login_oauth/LoginOAuthInteractor.ts
import { ILoginOAuthInputPort } from './ILoginOAuthInputPort';
import { ILoginOAuthOutputPort } from './ILoginOAuthOutputPort';
import { IOAuthValidationGateway } from './IOAuthValidationGateway';
import { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';
import { LoginOAuthRequest } from './LoginOAuthRequest';
import { LoginOAuthResponse } from './LoginOAuthResponse';
import { User } from '../../../1_entities/auth/User';
import { OAuthAccount } from '../../../1_entities/auth/OAuthAccount';
import { Session } from '../../../1_entities/auth/Session';

export class LoginOAuthInteractor implements ILoginOAuthInputPort {
  constructor(
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly authCommandGateway: IAuthCommandGateway,
    private readonly oauthValidationGateway: IOAuthValidationGateway,
    private readonly outputPort: ILoginOAuthOutputPort,
  ) {}

  public async execute(request: LoginOAuthRequest): Promise<void> {
    try {
      let isNewUser = false;

      const profile =
        await this.oauthValidationGateway.verifyTokenAndGetProfile(
          request.providerName,
          request.token,
        );

      let user = await this.authQueryGateway.findUserByEmail(profile.email);

      if (!user) {
        isNewUser = true;

        user = new User(
          crypto.randomUUID(),
          profile.email,
          profile.firstName,
          profile.lastName,
          true,
          null,
        );

        const oauthAccount = new OAuthAccount(
          user.id,
          request.providerName,
          profile.providerId,
        );

        await this.authCommandGateway.saveNewOAuthUser(user, oauthAccount);
      } else {
        if (!user.canLogin()) {
          throw new Error('El usuario está inactivo');
        }
      }

      const session = new Session(
        crypto.randomUUID(),
        user.id,
        new Date(Date.now() + 86400000),
      );

      await this.authCommandGateway.saveSession(session);

      const response = new LoginOAuthResponse(
        session.id,
        user.firstName,
        isNewUser,
      );
      this.outputPort.presentSuccess(response);
    } catch (error) {
      this.outputPort.presentError(error as Error);
    }
  }
}
