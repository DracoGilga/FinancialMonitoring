// src/2_use_cases/auth/login_oauth/LoginOAuthInteractor.ts
import { ILoginOAuthInputPort } from './ILoginOAuthInputPort';
import {
  ILoginOAuthOutputPort,
  LoginOAuthViewModel,
} from './ILoginOAuthOutputPort';
import { IOAuthValidationGateway } from './IOAuthValidationGateway';
import { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';
import { ITokenGenerator } from '../shared_ports/ITokenGenerator';
import { IRefreshTokenGenerator } from '../shared_ports/IRefreshTokenGenerator';
import { ISessionStore } from '../shared_ports/ISessionStore';
import { LoginOAuthRequest } from './LoginOAuthRequest';
import { LoginOAuthResponse } from './LoginOAuthResponse';
import { User } from '../../../1_entities/auth/User';
import { OAuthAccount } from '../../../1_entities/auth/OAuthAccount';
import { Session } from '../../../1_entities/auth/Session';
import * as crypto from 'node:crypto';

export class LoginOAuthInteractor implements ILoginOAuthInputPort {
  constructor(
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly authCommandGateway: IAuthCommandGateway,
    private readonly oauthValidationGateway: IOAuthValidationGateway,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly refreshTokenDays: number,
    private readonly outputPort: ILoginOAuthOutputPort,
    private readonly sessionStore?: ISessionStore,
    private readonly refreshTokenGenerator?: IRefreshTokenGenerator,
  ) {}

  public async execute(
    request: LoginOAuthRequest,
  ): Promise<LoginOAuthViewModel> {
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

      const accessToken = this.tokenGenerator.generateAccessToken(
        user.id,
        user.email,
      );

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + this.refreshTokenDays);

      const session = new Session(crypto.randomUUID(), user.id, expirationDate);
      const refreshToken = this.refreshTokenGenerator?.generate() || session.id;

      await this.authCommandGateway.saveSession(session);

      if (this.sessionStore && this.refreshTokenGenerator) {
        const ttlSeconds = Math.max(
          1,
          Math.floor((expirationDate.getTime() - Date.now()) / 1000),
        );
        await this.sessionStore.save(
          this.refreshTokenGenerator.hash(refreshToken),
          {
            userId: user.id,
            expiresAt: expirationDate,
            ip: request.ip || 'unknown',
            userAgent: request.userAgent || 'unknown',
          },
          ttlSeconds,
        );
      }

      const response = new LoginOAuthResponse(
        accessToken,
        session.id,
        user.firstName,
        isNewUser,
      );

      return this.outputPort.presentSuccess(response);
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
