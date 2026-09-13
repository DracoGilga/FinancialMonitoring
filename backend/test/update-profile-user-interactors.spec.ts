// test/update-profile-user-interactors.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { User } from '../src/1_entities/auth/User';
import { IAuthCommandGateway } from '../src/2_use_cases/auth/shared_ports/IAuthCommandGateway';
import { IAuthQueryGateway } from '../src/2_use_cases/auth/shared_ports/IAuthQueryGateway';
import { IImageProcessorGateway } from '../src/2_use_cases/auth/shared_ports/IImageProcessorGateway';
import { IStorageGateway } from '../src/2_use_cases/auth/shared_ports/IStorageGateway';
import { IUpdateProfilePictureOutputPort } from '../src/2_use_cases/auth/update_profile_picture/IUpdateProfilePictureOutputPort';
import { UpdateProfilePictureInteractor } from '../src/2_use_cases/auth/update_profile_picture/UpdateProfilePictureInteractor';
import { UpdateProfilePictureRequest } from '../src/2_use_cases/auth/update_profile_picture/UpdateProfilePictureRequest';
import { IUpdateUserOutputPort } from '../src/2_use_cases/auth/update_user/IUpdateUserOutputPort';
import { UpdateUserInteractor } from '../src/2_use_cases/auth/update_user/UpdateUserInteractor';
import { UpdateProfilePicturePresenter } from '../src/3_interface_adapters/presenters/auth/UpdateProfilePicturePresenter';
import { UpdateUserPresenter } from '../src/3_interface_adapters/presenters/auth/UpdateUserPresenter';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const commandGateway = (): jest.Mocked<IAuthCommandGateway> => ({
  saveSession: mock<IAuthCommandGateway['saveSession']>(),
  saveNewOAuthUser: mock<IAuthCommandGateway['saveNewOAuthUser']>(),
  saveNewUser: mock<IAuthCommandGateway['saveNewUser']>(),
  updateUser: mock<IAuthCommandGateway['updateUser']>(),
  updateProfilePicture: mock<IAuthCommandGateway['updateProfilePicture']>(),
});

describe('UpdateProfilePictureInteractor', () => {
  const create = () => {
    const output: jest.Mocked<IUpdateProfilePictureOutputPort> = {
      presentSuccess: mock<IUpdateProfilePictureOutputPort['presentSuccess']>(
        (response) => ({
          fileName: response.fileName,
          success: response.success,
        }),
      ),
      presentError: mock<IUpdateProfilePictureOutputPort['presentError']>(
        (error) => ({ error: error.message }),
      ),
    };
    const storage: jest.Mocked<IStorageGateway> = {
      saveFile:
        mock<IStorageGateway['saveFile']>().mockResolvedValue(
          'user-1-profile.jpg',
        ),
      getFileBuffer: mock<IStorageGateway['getFileBuffer']>(),
    };
    const processor: jest.Mocked<IImageProcessorGateway> = {
      sanitizeAndProcess: mock<
        IImageProcessorGateway['sanitizeAndProcess']
      >().mockResolvedValue(Buffer.from('safe')),
    };
    const command = commandGateway();
    return {
      interactor: new UpdateProfilePictureInteractor(
        output,
        storage,
        processor,
        command,
      ),
      output,
      storage,
      processor,
      command,
    };
  };

  it('sanitizes, stores, persists and presents the image', async () => {
    const fixture = create();
    const original = Buffer.from('original');

    await expect(
      fixture.interactor.execute(
        new UpdateProfilePictureRequest('user-1', original),
      ),
    ).resolves.toEqual({ fileName: 'user-1-profile.jpg', success: true });
    expect(fixture.processor.sanitizeAndProcess).toHaveBeenCalledWith(original);
    expect(fixture.storage.saveFile).toHaveBeenCalledWith(
      'user-1-profile.jpg',
      Buffer.from('safe'),
    );
    expect(fixture.command.updateProfilePicture).toHaveBeenCalledWith(
      'user-1',
      'user-1-profile.jpg',
    );
  });

  it.each(['processor', 'storage', 'database'])(
    'presents %s errors and stops subsequent work',
    async (stage) => {
      const fixture = create();
      if (stage === 'processor') {
        fixture.processor.sanitizeAndProcess.mockRejectedValue(
          new Error('processor failed'),
        );
      } else if (stage === 'storage') {
        fixture.storage.saveFile.mockRejectedValue(new Error('storage failed'));
      } else {
        fixture.command.updateProfilePicture.mockRejectedValue(
          new Error('database failed'),
        );
      }

      await expect(
        fixture.interactor.execute(
          new UpdateProfilePictureRequest('user-1', Buffer.from('image')),
        ),
      ).resolves.toEqual({ error: `${stage} failed` });
      expect(fixture.output.presentError).toHaveBeenCalled();
      if (stage === 'processor') {
        expect(fixture.storage.saveFile).not.toHaveBeenCalled();
      }
      if (stage !== 'database') {
        expect(fixture.command.updateProfilePicture).not.toHaveBeenCalled();
      }
    },
  );

  it('tests the concrete presenter success and error boundaries', () => {
    const presenter = new UpdateProfilePicturePresenter();
    expect(
      presenter.presentSuccess({ fileName: 'photo.jpg', success: true }),
    ).toEqual({
      message: 'Profile picture updated successfully',
      data: { fileName: 'photo.jpg' },
    });
    expect(() => presenter.presentError(new Error('failed'))).toThrow('failed');
  });
});

describe('UpdateUserInteractor', () => {
  const user = new User(
    'user-1',
    'old@example.com',
    'Old',
    'Name',
    true,
    'hash',
  );

  const create = (found: User | null = user, emailUser: User | null = null) => {
    const query: jest.Mocked<IAuthQueryGateway> = {
      findUserById:
        mock<IAuthQueryGateway['findUserById']>().mockResolvedValue(found),
      findUserByEmail:
        mock<IAuthQueryGateway['findUserByEmail']>().mockResolvedValue(
          emailUser,
        ),
    };
    const command = commandGateway();
    const output: jest.Mocked<IUpdateUserOutputPort> = {
      presentSuccess: mock<IUpdateUserOutputPort['presentSuccess']>(
        (response) => ({
          status: 'success',
          data: response,
        }),
      ),
      presentError: mock<IUpdateUserOutputPort['presentError']>((error) => ({
        status: 'error',
        message: error.message,
      })),
    };
    return {
      interactor: new UpdateUserInteractor(query, command, output),
      query,
      command,
      output,
    };
  };

  it('updates all provided fields including a null last name', async () => {
    const fixture = create();
    const result = await fixture.interactor.execute({
      userId: 'user-1',
      email: 'new@example.com',
      firstName: 'New',
      lastName: null,
    });

    expect(result).toEqual({
      status: 'success',
      data: {
        id: 'user-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: null,
      },
    });
    expect(fixture.query.findUserByEmail).toHaveBeenCalledWith(
      'new@example.com',
    );
    expect(fixture.command.updateUser).toHaveBeenCalledWith('user-1', {
      email: 'new@example.com',
      firstName: 'New',
      lastName: null,
    });
  });

  it('does not query duplicate email when the email is unchanged', async () => {
    const fixture = create();
    await fixture.interactor.execute({
      userId: 'user-1',
      email: 'old@example.com',
    });
    expect(fixture.query.findUserByEmail).not.toHaveBeenCalled();
  });

  it.each([
    [null, null, {}, 'User does not exist'],
    [user, null, {}, 'At least one field must be provided for update'],
    [
      user,
      new User('other', 'taken@example.com', 'Other', null, true, null),
      { email: 'taken@example.com' },
      'Email is already registered',
    ],
  ])(
    'validates user and update data',
    async (found, emailUser, changes, message) => {
      const fixture = create(found, emailUser);
      await expect(
        fixture.interactor.execute({ userId: 'user-1', ...changes }),
      ).resolves.toEqual({ status: 'error', message });
      expect(fixture.command.updateUser).not.toHaveBeenCalled();
    },
  );

  it('allows an email lookup that resolves to the same user', async () => {
    const fixture = create(user, user);
    await expect(
      fixture.interactor.execute({
        userId: 'user-1',
        email: 'new@example.com',
      }),
    ).resolves.toMatchObject({ status: 'success' });
  });

  it('presents command failures and concrete presenter results', async () => {
    const fixture = create();
    fixture.command.updateUser.mockRejectedValue(new Error('database failed'));
    await expect(
      fixture.interactor.execute({ userId: 'user-1', firstName: 'New' }),
    ).resolves.toEqual({ status: 'error', message: 'database failed' });

    const presenter = new UpdateUserPresenter();
    const response = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'User',
      lastName: null,
    };
    expect(presenter.presentSuccess(response)).toEqual({
      status: 'success',
      data: response,
    });
    expect(presenter.presentError(new Error('failed'))).toEqual({
      status: 'error',
      message: 'failed',
    });
  });
});
