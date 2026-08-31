// src/3_interface_adapters/gateways/auth/AuthCommandGatewayImpl.ts
import { Injectable } from '@nestjs/common';
import { IAuthCommandGateway } from '../../../2_use_cases/auth/shared_ports/IAuthCommandGateway';
import { User } from '../../../1_entities/auth/User';
import { OAuthAccount } from '../../../1_entities/auth/OAuthAccount';
import { Session } from '../../../1_entities/auth/Session';
import { PrismaService } from '../db/PrismaService';

@Injectable()
export class AuthCommandGatewayImpl implements IAuthCommandGateway {
  constructor(private readonly prisma: PrismaService) {}

  public async saveNewOAuthUser(
    user: User,
    oauthAccount: OAuthAccount,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          passwordHash: user.getPasswordHash(),
        },
      }),
      this.prisma.oAuthAccount.create({
        data: {
          id: oauthAccount.userId,
          userId: oauthAccount.userId,
          providerName: oauthAccount.providerName,
          providerId: oauthAccount.providerId,
        },
      }),
    ]);
  }

  public async saveNewUser(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        passwordHash: user.getPasswordHash(),
      },
    });
  }

  public async saveSession(session: Session): Promise<void> {
    console.log('Guardando sesión temporalmente en memoria:', session);
  }
}
