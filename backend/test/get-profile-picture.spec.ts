// test/get-profile-picture.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { IStorageGateway } from '../src/2_use_cases/auth/shared_ports/IStorageGateway';
import { GetProfilePictureInteractor } from '../src/2_use_cases/auth/get_profile_picture/GetProfilePictureInteractor';
import { IGetProfilePictureOutputPort } from '../src/2_use_cases/auth/get_profile_picture/IGetProfilePictureOutputPort';

describe('GetProfilePictureInteractor', () => {
  it('loads the picture belonging to the requested authenticated user', async () => {
    const storageGateway: jest.Mocked<IStorageGateway> = {
      saveFile: jest.fn<IStorageGateway['saveFile']>(),
      getFileBuffer: jest
        .fn<IStorageGateway['getFileBuffer']>()
        .mockResolvedValue(Buffer.from('image')),
    };
    const outputPort: jest.Mocked<IGetProfilePictureOutputPort> = {
      presentSuccess: jest.fn<IGetProfilePictureOutputPort['presentSuccess']>(
        (response) => response,
      ),
      presentError: jest.fn<IGetProfilePictureOutputPort['presentError']>(),
    };
    const interactor = new GetProfilePictureInteractor(
      outputPort,
      storageGateway,
    );

    const result = await interactor.execute({ userId: 'owner-1' });

    expect(storageGateway.getFileBuffer).toHaveBeenCalledWith(
      'owner-1-profile.jpg',
    );
    expect(result).toMatchObject({
      fileBuffer: Buffer.from('image'),
      fileName: 'owner-1-profile.jpg',
      contentType: 'image/jpeg',
    });
  });

  it('does not load another user picture when the storage lookup fails', async () => {
    const storageGateway: jest.Mocked<IStorageGateway> = {
      saveFile: jest.fn<IStorageGateway['saveFile']>(),
      getFileBuffer: jest
        .fn<IStorageGateway['getFileBuffer']>()
        .mockRejectedValue(new Error('Picture not found')),
    };
    const outputPort: jest.Mocked<IGetProfilePictureOutputPort> = {
      presentSuccess: jest.fn<IGetProfilePictureOutputPort['presentSuccess']>(),
      presentError: jest.fn<IGetProfilePictureOutputPort['presentError']>(
        (error) => {
          throw error;
        },
      ),
    };
    const interactor = new GetProfilePictureInteractor(
      outputPort,
      storageGateway,
    );

    await expect(interactor.execute({ userId: 'owner-1' })).rejects.toThrow(
      'Picture not found',
    );
    expect(storageGateway.getFileBuffer).toHaveBeenCalledTimes(1);
  });
});
