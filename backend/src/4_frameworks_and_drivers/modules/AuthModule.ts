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
      provide: 'ILoginInputPort',
      useFactory: (queryGw, commandGw, hasher, outputPort) => {
        return new LoginManualInteractor(
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
        'ILoginOutputPort',
      ],
    },
    {
      provide: 'IPasswordHasher',
      useFactory: () => {
        const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS || '12', 10);
        return new BcryptPasswordHasher(saltRounds);
      },
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
  ],
})
export class AuthModule {}
