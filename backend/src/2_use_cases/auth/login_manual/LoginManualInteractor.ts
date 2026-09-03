// src/2_use_cases/auth/login_manual/LoginManualInteractor.ts
import { ILoginInputPort } from './ILoginInputPort';
import { ILoginOutputPort, LoginResultViewModel } from './ILoginOutputPort';
import { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';
import { IPasswordHasher } from '../shared_ports/IPasswordHasher';
import { ITokenGenerator } from '../shared_ports/ITokenGenerator';
import { IRefreshTokenGenerator } from '../shared_ports/IRefreshTokenGenerator';
import { ISessionStore } from '../shared_ports/ISessionStore';
import { LoginManualRequest } from './LoginManualRequest';
import { LoginManualResponse } from './LoginManualResponse';
import { Session } from '../../../1_entities/auth/Session';
import * as crypto from 'node:crypto';

export class LoginManualInteractor implements ILoginInputPort {
  constructor(
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly authCommandGateway: IAuthCommandGateway,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly refreshTokenDays: number,
    private readonly outputPort: ILoginOutputPort,
    private readonly sessionStore?: ISessionStore,
    private readonly refreshTokenGenerator?: IRefreshTokenGenerator,
  ) {}

  public async execute(
    request: LoginManualRequest,
  ): Promise<LoginResultViewModel> {
    try {
      const user = await this.authQueryGateway.findUserByEmail(request.email);

      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      if (!user.canLogin()) {
        throw new Error('El usuario está inactivo');
      }

      const storedHash = user.getPasswordHash();

      if (!storedHash) {
        throw new Error('Credenciales inválidas');
      }

      const isPasswordValid = await this.passwordHasher.compare(
        request.plainPassword,
        storedHash,
      );

      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
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
        const refreshTokenHash = this.refreshTokenGenerator.hash(refreshToken);
        const ttlSeconds = Math.max(
          1,
          Math.floor((expirationDate.getTime() - Date.now()) / 1000),
        );
        await this.sessionStore.save(
          refreshTokenHash,
          {
            userId: user.id,
            expiresAt: expirationDate,
            ip: request.ip || 'unknown',
            userAgent: request.userAgent || 'unknown',
          },
          ttlSeconds,
        );
      }

      const response = new LoginManualResponse(
        accessToken,
        session.id,
        user.firstName,
      );
      return this.outputPort.presentSuccess(response);
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
