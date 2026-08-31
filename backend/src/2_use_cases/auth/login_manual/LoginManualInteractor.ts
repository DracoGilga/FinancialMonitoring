// src/2_use_cases/auth/login_manual/LoginManualInteractor.ts
import { ILoginInputPort } from './ILoginInputPort';
import { ILoginOutputPort, LoginResultViewModel } from './ILoginOutputPort';
import { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';
import { LoginManualRequest } from './LoginManualRequest';
import { LoginManualResponse } from './LoginManualResponse';
import { Session } from '../../../1_entities/auth/Session';

export class LoginManualInteractor implements ILoginInputPort {
  constructor(
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly authCommandGateway: IAuthCommandGateway,
    private readonly outputPort: ILoginOutputPort,
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

      const session = new Session(
        crypto.randomUUID(),
        user.id,
        new Date(Date.now() + 86400000),
      );

      await this.authCommandGateway.saveSession(session);

      const response = new LoginManualResponse(session.id, user.firstName);
      return this.outputPort.presentSuccess(response);
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
