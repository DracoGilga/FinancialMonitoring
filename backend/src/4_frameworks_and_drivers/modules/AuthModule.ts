// src/4_frameworks_and_drivers/modules/AuthModule.ts
import { Module } from '@nestjs/common';
import * as path from 'node:path';
import { AuthController } from '../../3_interface_adapters/controllers/auth/AuthController';
import { ProfilePictureController } from '../../3_interface_adapters/controllers/auth/ProfilePictureController';
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
import { UpdateUserInteractor } from '../../2_use_cases/auth/update_user/UpdateUserInteractor';
import { UpdateUserPresenter } from '../../3_interface_adapters/presenters/auth/UpdateUserPresenter';
import type { IUpdateUserOutputPort } from '../../2_use_cases/auth/update_user/IUpdateUserOutputPort';
import { UpdateProfilePictureInteractor } from '../../2_use_cases/auth/update_profile_picture/UpdateProfilePictureInteractor';
import { UpdateProfilePicturePresenter } from '../../3_interface_adapters/presenters/auth/UpdateProfilePicturePresenter';
import { GetProfilePictureInteractor } from '../../2_use_cases/auth/get_profile_picture/GetProfilePictureInteractor';
import { GetProfilePicturePresenter } from '../../3_interface_adapters/presenters/auth/GetProfilePicturePresenter';
import { LocalStorageGatewayImpl } from '../../3_interface_adapters/gateways/auth/LocalStorageGatewayImpl';
import { SharpImageProcessorImpl } from '../../3_interface_adapters/gateways/auth/SharpImageProcessorImpl';
import {
  CloudStorageGatewayImpl,
  type CloudStorageConfig,
} from '../../3_interface_adapters/gateways/auth/CloudStorageGatewayImpl';

@Module({
  controllers: [AuthController, ProfilePictureController],
  providers: [
    PrismaService,
    {
      provide: RedisSessionStore,
      useFactory: () =>
        new RedisSessionStore(
          process.env.REDIS_HOST || 'redis',
          parseInt(process.env.REDIS_PORT || '6379', 10),
          process.env.REDIS_PASSWORD,
        ),
    },
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
      provide: 'IStorageGateway',
      useFactory: () => {
        const provider = process.env.STORAGE_PROVIDER || 'local';

        if (provider !== 'local') {
          if (
            provider !== 'aws' &&
            provider !== 'gcp' &&
            provider !== 'azure' &&
            provider !== 'oracle'
          ) {
            throw new Error(`Unsupported storage provider: ${provider}`);
          }

          const providerSettings = {
            aws: {
              bucket: process.env.AWS_STORAGE_BUCKET,
              region: process.env.AWS_STORAGE_REGION,
              accessKeyId: process.env.AWS_STORAGE_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_STORAGE_SECRET_ACCESS_KEY,
              endpoint: process.env.AWS_STORAGE_ENDPOINT,
            },
            gcp: {
              bucket: process.env.GCP_STORAGE_BUCKET,
              region: undefined,
              accessKeyId: undefined,
              secretAccessKey: undefined,
              endpoint: process.env.GCP_STORAGE_ENDPOINT,
            },
            azure: {
              bucket: undefined,
              region: undefined,
              accessKeyId: undefined,
              secretAccessKey: undefined,
              endpoint: process.env.AZURE_STORAGE_ENDPOINT,
            },
            oracle: {
              bucket: process.env.ORACLE_STORAGE_BUCKET,
              region: process.env.ORACLE_STORAGE_REGION,
              accessKeyId: process.env.ORACLE_STORAGE_ACCESS_KEY_ID,
              secretAccessKey: process.env.ORACLE_STORAGE_SECRET_ACCESS_KEY,
              endpoint: process.env.ORACLE_STORAGE_ENDPOINT,
            },
          } as const;
          const settings = providerSettings[provider];

          const config: CloudStorageConfig = {
            provider,
            bucket: process.env.STORAGE_BUCKET || settings.bucket || '',
            region: process.env.STORAGE_REGION || settings.region,
            accessKeyId:
              process.env.STORAGE_ACCESS_KEY_ID || settings.accessKeyId,
            secretAccessKey:
              process.env.STORAGE_SECRET_ACCESS_KEY || settings.secretAccessKey,
            endpoint: process.env.STORAGE_ENDPOINT || settings.endpoint,
            projectId:
              process.env.GCP_PROJECT_ID ||
              (settings.endpoint ? 'local-project' : undefined),
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            accountName: process.env.AZURE_STORAGE_ACCOUNT,
            accountKey: process.env.AZURE_STORAGE_KEY,
            container: process.env.AZURE_STORAGE_CONTAINER,
          };

          return new CloudStorageGatewayImpl(config);
        }

        const baseUploadPath = process.env.BASE_UPLOAD_PATH;
        const uploadDirectory = baseUploadPath
          ? path.join(path.resolve(baseUploadPath), 'profiles')
          : path.join(process.cwd(), 'uploads', 'profiles');

        return new LocalStorageGatewayImpl(uploadDirectory);
      },
    },
    {
      provide: 'IImageProcessorGateway',
      useClass: SharpImageProcessorImpl,
    },
    {
      provide: 'IUpdateProfilePictureOutputPort',
      useClass: UpdateProfilePicturePresenter,
    },
    {
      provide: 'IUpdateProfilePictureInputPort',
      useClass: UpdateProfilePictureInteractor,
    },
    {
      provide: 'IGetProfilePictureOutputPort',
      useClass: GetProfilePicturePresenter,
    },
    {
      provide: 'IGetProfilePictureInputPort',
      useClass: GetProfilePictureInteractor,
    },
    {
      provide: 'IUpdateUserOutputPort',
      useClass: UpdateUserPresenter,
    },
    {
      provide: 'IUpdateUserInputPort',
      useFactory: (
        queryGateway: IAuthQueryGateway,
        commandGateway: IAuthCommandGateway,
        outputPort: IUpdateUserOutputPort,
      ) => new UpdateUserInteractor(queryGateway, commandGateway, outputPort),
      inject: [
        'IAuthQueryGateway',
        'IAuthCommandGateway',
        'IUpdateUserOutputPort',
      ],
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
