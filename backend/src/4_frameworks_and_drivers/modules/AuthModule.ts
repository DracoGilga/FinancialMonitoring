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

@Module({
  controllers: [AuthController],
  providers: [
    PrismaService,
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
      useFactory: (queryGw, commandGw, hasher, tokenGenerator, outputPort) => {
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
        );
      },
      inject: [
        'IAuthQueryGateway',
        'IAuthCommandGateway',
        'IPasswordHasher',
        'ITokenGenerator',
        'ILoginOutputPort',
      ],
    },
    {
      provide: 'IRegisterManualOutputPort',
      useClass: RegisterPresenter,
    },
    {
      provide: 'IRegisterManualInputPort',
      useFactory: (queryGw, commandGw, hasher, outputPort) => {
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
        queryGw,
        commandGw,
        oauthValidationGw,
        tokenGenerator,
        outputPort,
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
        );
      },
      inject: [
        'IAuthQueryGateway',
        'IAuthCommandGateway',
        'IOAuthValidationGateway',
        'ITokenGenerator',
        'ILoginOAuthOutputPort',
      ],
    },
  ],
})
export class AuthModule {}
