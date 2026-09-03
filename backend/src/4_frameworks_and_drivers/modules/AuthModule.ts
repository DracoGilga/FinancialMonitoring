// src/4_frameworks_and_drivers/modules/AuthModule.ts
import { Module } from '@nestjs/common';
import { AuthController } from '../../3_interface_adapters/controllers/auth/AuthController';
import { PrismaService } from '../../3_interface_adapters/gateways/db/PrismaService';
import { AuthQueryGatewayImpl } from '../../3_interface_adapters/gateways/auth/AuthQueryGatewayImpl';
import { AuthCommandGatewayImpl } from '../../3_interface_adapters/gateways/auth/AuthCommandGatewayImpl';
import { LoginManualInteractor } from '../../2_use_cases/auth/login_manual/LoginManualInteractor';
import { LoginPresenter } from '../../3_interface_adapters/presenters/auth/LoginPresenter';
import { RegisterManualInteractor } from '../../2_use_cases/auth/register_manual/RegisterManualInteractor';
import { RegisterPresenter } from '../../3_interface_adapters/presenters/auth/RegisterPresenter';
import { BcryptPasswordHasher } from '../../3_interface_adapters/gateways/auth/BcryptPasswordHasher';
import { JwtTokenGenerator } from '../../3_interface_adapters/gateways/auth/JwtTokenGenerator';
import { OAuthValidationGatewayImpl } from '../../3_interface_adapters/gateways/auth/OAuthValidationGatewayImpl';
import { LoginOAuthPresenter } from '../../3_interface_adapters/presenters/auth/LoginOAuthPresenter';
import { LoginOAuthInteractor } from '../../2_use_cases/auth/login_oauth/LoginOAuthInteractor';
import type { IAuthQueryGateway } from '../../2_use_cases/auth/shared_ports/IAuthQueryGateway';
import type { IAuthCommandGateway } from '../../2_use_cases/auth/shared_ports/IAuthCommandGateway';
import type { IPasswordHasher } from '../../2_use_cases/auth/shared_ports/IPasswordHasher';
import type { ITokenGenerator } from '../../2_use_cases/auth/shared_ports/ITokenGenerator';
import type { ILoginOutputPort } from '../../2_use_cases/auth/login_manual/ILoginOutputPort';
import type { IRegisterManualOutputPort } from '../../2_use_cases/auth/register_manual/IRegisterManualOutputPort';
import type { IOAuthValidationGateway } from '../../2_use_cases/auth/login_oauth/IOAuthValidationGateway';
import type { ILoginOAuthOutputPort } from '../../2_use_cases/auth/login_oauth/ILoginOAuthOutputPort';
import { RedisSessionStore } from '../../3_interface_adapters/gateways/auth/RedisSessionStore';
import { SecureRefreshTokenGenerator } from '../../3_interface_adapters/gateways/auth/SecureRefreshTokenGenerator';
import { RefreshTokenService } from '../../2_use_cases/auth/refresh/RefreshTokenService';
import type { ISessionStore } from '../../2_use_cases/auth/shared_ports/ISessionStore';
import type { IRefreshTokenGenerator } from '../../2_use_cases/auth/shared_ports/IRefreshTokenGenerator';

@Module({
  controllers: [AuthController],
  providers: [
    PrismaService,
    RedisSessionStore,
    { provide: 'ISessionStore', useExisting: RedisSessionStore },
    {
      provide: 'IRefreshTokenGenerator',
      useClass: SecureRefreshTokenGenerator,
    },
    {
      provide: RefreshTokenService,
      useFactory: (
        sessionStore: ISessionStore,
        refreshTokenGenerator: IRefreshTokenGenerator,
        tokenGenerator: ITokenGenerator,
        queryGateway: IAuthQueryGateway,
      ) =>
        new RefreshTokenService(
          sessionStore,
          refreshTokenGenerator,
          tokenGenerator,
          queryGateway,
          parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7', 10),
        ),
      inject: [
        'ISessionStore',
        'IRefreshTokenGenerator',
        'ITokenGenerator',
        'IAuthQueryGateway',
      ],
    },
    {
      provide: 'IAuthQueryGateway',
      useClass: AuthQueryGatewayImpl,
    },
    {
      provide: 'IAuthCommandGateway',
      useClass: AuthCommandGatewayImpl,
    },
    {
      provide: 'ILoginOutputPort',
      useClass: LoginPresenter,
    },
    {
      provide: 'IPasswordHasher',
      useFactory: () => {
        const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS || '12', 10);
        return new BcryptPasswordHasher(saltRounds);
      },
    },
    {
      provide: 'ITokenGenerator',
      useFactory: () => {
        const secret = process.env.JWT_SECRET || 'super_secreto_de_respaldo';
        const expiresIn = parseInt(
          process.env.JWT_EXPIRES_IN_MINUTES || '15',
          10,
        );
        return new JwtTokenGenerator(secret, expiresIn);
      },
    },
    {
      provide: 'ILoginInputPort',
      useFactory: (
        queryGw: IAuthQueryGateway,
        commandGw: IAuthCommandGateway,
        hasher: IPasswordHasher,
        tokenGenerator: ITokenGenerator,
        outputPort: ILoginOutputPort,
        sessionStore: ISessionStore,
        refreshTokenGenerator: IRefreshTokenGenerator,
      ) => {
        const refreshTokenDays = parseInt(
          process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7',
          10,
        );

        return new LoginManualInteractor(
          queryGw,
          commandGw,
          hasher,
          tokenGenerator,
          refreshTokenDays,
          outputPort,
          sessionStore,
          refreshTokenGenerator,
        );
      },
      inject: [
        'IAuthQueryGateway',
        'IAuthCommandGateway',
        'IPasswordHasher',
        'ITokenGenerator',
        'ILoginOutputPort',
        'ISessionStore',
        'IRefreshTokenGenerator',
      ],
    },
    {
      provide: 'IRegisterManualOutputPort',
      useClass: RegisterPresenter,
    },
    {
      provide: 'IRegisterManualInputPort',
      useFactory: (
        queryGw: IAuthQueryGateway,
        commandGw: IAuthCommandGateway,
        hasher: IPasswordHasher,
        outputPort: IRegisterManualOutputPort,
      ) => {
        return new RegisterManualInteractor(
          queryGw,
          commandGw,
          hasher,
          outputPort,
        );
      },
      inject: [
        'IAuthQueryGateway',
        'IAuthCommandGateway',
        'IPasswordHasher',
        'IRegisterManualOutputPort',
      ],
    },
    {
      provide: 'IOAuthValidationGateway',
      useFactory: () => {
        const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
        const facebookAppId = process.env.FACEBOOK_APP_ID || '';
        const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || '';

        return new OAuthValidationGatewayImpl(
          googleClientId,
          facebookAppId,
          facebookAppSecret,
        );
      },
    },
    {
      provide: 'ILoginOAuthOutputPort',
      useClass: LoginOAuthPresenter,
    },
    {
      provide: 'ILoginOAuthInputPort',
      useFactory: (
        queryGw: IAuthQueryGateway,
        commandGw: IAuthCommandGateway,
        oauthValidationGw: IOAuthValidationGateway,
        tokenGenerator: ITokenGenerator,
        outputPort: ILoginOAuthOutputPort,
        sessionStore: ISessionStore,
        refreshTokenGenerator: IRefreshTokenGenerator,
      ) => {
        const refreshTokenDays = parseInt(
          process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7',
          10,
        );

        return new LoginOAuthInteractor(
          queryGw,
          commandGw,
          oauthValidationGw,
          tokenGenerator,
          refreshTokenDays,
          outputPort,
          sessionStore,
          refreshTokenGenerator,
        );
      },
      inject: [
        'IAuthQueryGateway',
        'IAuthCommandGateway',
        'IOAuthValidationGateway',
        'ITokenGenerator',
        'ILoginOAuthOutputPort',
        'ISessionStore',
        'IRefreshTokenGenerator',
      ],
    },
  ],
})
export class AuthModule {}
