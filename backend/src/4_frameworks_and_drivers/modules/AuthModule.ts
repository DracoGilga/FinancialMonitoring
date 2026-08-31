import { Module } from '@nestjs/common';
import { AuthController } from '../../3_interface_adapters/controllers/auth/AuthController';
import { LoginManualInteractor } from '../../2_use_cases/auth/login_manual/LoginManualInteractor';
import { AuthQueryGatewayImpl } from '../../3_interface_adapters/gateways/auth/AuthQueryGatewayImpl';
import { AuthCommandGatewayImpl } from '../../3_interface_adapters/gateways/auth/AuthCommandGatewayImpl';
import { LoginPresenter } from '../../3_interface_adapters/presenters/auth/LoginPresenter';
import { PrismaService } from '../../3_interface_adapters/gateways/db/PrismaService';

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
      useFactory: (queryGw, commandGw, outputPort) => {
        return new LoginManualInteractor(queryGw, commandGw, outputPort);
      },
      inject: ['IAuthQueryGateway', 'IAuthCommandGateway', 'ILoginOutputPort'],
    },
  ],
})
export class AuthModule {}
