// src/2_use_cases/auth/register_manual/RegisterManualInteractor.ts
import { IRegisterManualInputPort } from './IRegisterManualInputPort';
import {
  IRegisterManualOutputPort,
  RegisterResultViewModel,
} from './IRegisterManualOutputPort';
import { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';
import { IPasswordHasher } from '../shared_ports/IPasswordHasher';
import { RegisterManualRequest } from './RegisterManualRequest';
import { RegisterManualResponse } from './RegisterManualResponse';
import { User } from '../../../1_entities/auth/User';
import * as crypto from 'node:crypto';

export class RegisterManualInteractor implements IRegisterManualInputPort {
  constructor(
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly authCommandGateway: IAuthCommandGateway,
    private readonly passwordHasher: IPasswordHasher,
    private readonly outputPort: IRegisterManualOutputPort,
  ) {}

  public async execute(
    request: RegisterManualRequest,
  ): Promise<RegisterResultViewModel> {
    try {
      const existingUser = await this.authQueryGateway.findUserByEmail(
        request.email,
      );
      if (existingUser) {
        throw new Error('El correo ya está registrado');
      }

      const hashedPassword = await this.passwordHasher.hash(request.password);

      const newUser = new User(
        crypto.randomUUID(),
        request.email,
        request.firstName,
        request.lastName || null,
        true,
        hashedPassword,
      );

      if (!newUser.hasValidEmail()) {
        throw new Error('El formato del correo es inválido');
      }

      await this.authCommandGateway.saveNewUser(newUser);

      const response: RegisterManualResponse = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      };

      return this.outputPort.presentSuccess(response);
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
