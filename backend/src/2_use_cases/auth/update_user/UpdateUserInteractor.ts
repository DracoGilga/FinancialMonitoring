import {
  IUpdateUserOutputPort,
  UpdateUserResultViewModel,
} from './IUpdateUserOutputPort';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';
import { IAuthQueryGateway } from '../shared_ports/IAuthQueryGateway';
import { IUpdateUserInputPort } from './IUpdateUserInputPort';
import { UpdateUserRequest } from './UpdateUserRequest';
import { UpdateUserResponse } from './UpdateUserResponse';

export class UpdateUserInteractor implements IUpdateUserInputPort {
  constructor(
    private readonly authQueryGateway: IAuthQueryGateway,
    private readonly authCommandGateway: IAuthCommandGateway,
    private readonly outputPort: IUpdateUserOutputPort,
  ) {}

  public async execute(
    request: UpdateUserRequest,
  ): Promise<UpdateUserResultViewModel> {
    try {
      const user = await this.authQueryGateway.findUserById(request.userId);

      if (!user) {
        throw new Error('El usuario no existe');
      }

      if (request.email && request.email !== user.email) {
        const userWithEmail = await this.authQueryGateway.findUserByEmail(
          request.email,
        );
        if (userWithEmail && userWithEmail.id !== user.id) {
          throw new Error('El correo ya está registrado');
        }
      }

      const data = {
        ...(request.email !== undefined && { email: request.email }),
        ...(request.firstName !== undefined && {
          firstName: request.firstName,
        }),
        ...(request.lastName !== undefined && { lastName: request.lastName }),
      };

      if (Object.keys(data).length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      await this.authCommandGateway.updateUser(request.userId, data);

      const response: UpdateUserResponse = {
        id: user.id,
        email: request.email ?? user.email,
        firstName: request.firstName ?? user.firstName,
        lastName:
          request.lastName !== undefined ? request.lastName : user.lastName,
      };

      return this.outputPort.presentSuccess(response);
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
