// src/2_use_cases/auth/get_profile_picture/GetProfilePictureInteractor.ts
import { Inject, Injectable } from '@nestjs/common';
import { IStorageGateway } from '../shared_ports/IStorageGateway';
import { IGetProfilePictureInputPort } from './IGetProfilePictureInputPort';
import { IGetProfilePictureOutputPort } from './IGetProfilePictureOutputPort';
import { GetProfilePictureRequest } from './GetProfilePictureRequest';
import { GetProfilePictureResponse } from './GetProfilePictureResponse';

@Injectable()
export class GetProfilePictureInteractor implements IGetProfilePictureInputPort {
  constructor(
    @Inject('IGetProfilePictureOutputPort')
    private readonly outputPort: IGetProfilePictureOutputPort,
    @Inject('IStorageGateway')
    private readonly storageGateway: IStorageGateway,
  ) {}

  async execute(
    request: GetProfilePictureRequest,
  ): Promise<GetProfilePictureResponse> {
    try {
      const fileName = `${request.userId}-profile.jpg`;
      const fileBuffer = await this.storageGateway.getFileBuffer(fileName);

      return this.outputPort.presentSuccess(
        new GetProfilePictureResponse(fileBuffer, fileName, 'image/jpeg'),
      );
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
