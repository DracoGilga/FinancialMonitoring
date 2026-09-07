// test/update-user.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { User } from '../src/1_entities/auth/User';
import { IAuthCommandGateway } from '../src/2_use_cases/auth/shared_ports/IAuthCommandGateway';
import { IAuthQueryGateway } from '../src/2_use_cases/auth/shared_ports/IAuthQueryGateway';
import { IUpdateUserOutputPort } from '../src/2_use_cases/auth/update_user/IUpdateUserOutputPort';
import { UpdateUserInteractor } from '../src/2_use_cases/auth/update_user/UpdateUserInteractor';

const activeUser = new User(
  'user-1',
  'user@example.com',
  'Cesar',
  'Developer',
  true,
  'stored-hash',
);

const createInteractor = (user: User | null, emailUser: User | null = null) => {
  const queryGateway: jest.Mocked<IAuthQueryGateway> = {
    findUserById: jest
      .fn<IAuthQueryGateway['findUserById']>()
      .mockResolvedValue(user),
    findUserByEmail: jest
      .fn<IAuthQueryGateway['findUserByEmail']>()
      .mockResolvedValue(emailUser),
  };
  const commandGateway: jest.Mocked<IAuthCommandGateway> = {
    saveSession: jest.fn<IAuthCommandGateway['saveSession']>(),
    saveNewOAuthUser: jest.fn<IAuthCommandGateway['saveNewOAuthUser']>(),
    saveNewUser: jest.fn<IAuthCommandGateway['saveNewUser']>(),
    updateUser: jest.fn<IAuthCommandGateway['updateUser']>(),
    updateProfilePicture:
      jest.fn<IAuthCommandGateway['updateProfilePicture']>(),
  };
  const outputPort: jest.Mocked<IUpdateUserOutputPort> = {
    presentSuccess: jest.fn<IUpdateUserOutputPort['presentSuccess']>(
      (response) => ({ status: 'success' as const, data: response }),
    ),
    presentError: jest.fn<IUpdateUserOutputPort['presentError']>((error) => ({
      status: 'error' as const,
      message: error.message,
    })),
  };

  return {
    interactor: new UpdateUserInteractor(
      queryGateway,
      commandGateway,
      outputPort,
    ),
    queryGateway,
    commandGateway,
    outputPort,
  };
};

describe('update user', () => {
  it('updates only the provided fields', async () => {
    const update = createInteractor(activeUser);

    const result = await update.interactor.execute({
      userId: 'user-1',
      firstName: 'Updated',
    });

    expect(result).toEqual({
      status: 'success',
      data: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Updated',
        lastName: 'Developer',
      },
    });
    expect(update.commandGateway.updateUser).toHaveBeenCalledWith('user-1', {
      firstName: 'Updated',
    });
  });

  it('rejects an email already used by another user', async () => {
    const update = createInteractor(
      activeUser,
      new User('user-2', 'taken@example.com', 'Other', null, true, null),
    );

    const result = await update.interactor.execute({
      userId: 'user-1',
      email: 'taken@example.com',
    });

    expect(result).toEqual({
      status: 'error',
      message: 'Email is already registered',
    });
    expect(update.commandGateway.updateUser).not.toHaveBeenCalled();
  });

  it('rejects an unknown user', async () => {
    const update = createInteractor(null);

    const result = await update.interactor.execute({
      userId: 'missing-user',
      firstName: 'Updated',
    });

    expect(result).toEqual({
      status: 'error',
      message: 'User does not exist',
    });
    expect(update.commandGateway.updateUser).not.toHaveBeenCalled();
  });
});
