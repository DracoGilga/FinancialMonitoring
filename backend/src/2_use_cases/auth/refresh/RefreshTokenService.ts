import type { IRefreshTokenGenerator } from '../shared_ports/IRefreshTokenGenerator';
import type { ISessionStore } from '../shared_ports/ISessionStore';
import type { ITokenGenerator } from '../shared_ports/ITokenGenerator';
import type { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';

export interface RefreshRequestContext {
  token: string;
  ip: string;
  userAgent: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class RefreshTokenService {
  constructor(
    private readonly sessionStore: ISessionStore,
    private readonly refreshTokenGenerator: IRefreshTokenGenerator,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly refreshTokenDays: number,
  ) {}

  async refresh(request: RefreshRequestContext): Promise<RefreshResult> {
    const oldHash = this.refreshTokenGenerator.hash(request.token);
    const session = await this.sessionStore.find(oldHash);

    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.ip !== request.ip ||
      session.userAgent !== request.userAgent
    ) {
      await this.sessionStore.delete(oldHash);
      throw new Error('Invalid refresh token context');
    }

    const user = await this.authQueryGateway.findUserById(session.userId);
    if (!user || !user.canLogin()) {
      await this.sessionStore.delete(oldHash);
      throw new Error('Invalid refresh token user');
    }

    const refreshToken = this.refreshTokenGenerator.generate();
    const refreshTokenHash = this.refreshTokenGenerator.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenDays);
    const ttlSeconds = Math.max(
      1,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );

    await this.sessionStore.delete(oldHash);
    await this.sessionStore.save(
      refreshTokenHash,
      {
        userId: session.userId,
        expiresAt,
        ip: request.ip,
        userAgent: request.userAgent,
      },
      ttlSeconds,
    );

    return {
      accessToken: this.tokenGenerator.generateAccessToken(
        session.userId,
        user.email,
      ),
      refreshToken,
      expiresAt,
    };
  }
}
