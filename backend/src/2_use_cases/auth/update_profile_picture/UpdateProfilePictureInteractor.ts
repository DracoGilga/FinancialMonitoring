// src/2_use_cases/auth/update_profile_picture/UpdateProfilePictureInteractor.ts
import { Inject, Injectable } from '@nestjs/common';
import { IUpdateProfilePictureInputPort } from './IUpdateProfilePictureInputPort';
import { IUpdateProfilePictureOutputPort } from './IUpdateProfilePictureOutputPort';
import { UpdateProfilePictureRequest } from './UpdateProfilePictureRequest';
import { UpdateProfilePictureResponse } from './UpdateProfilePictureResponse';
import { IStorageGateway } from '../shared_ports/IStorageGateway';
import { IImageProcessorGateway } from '../shared_ports/IImageProcessorGateway';
import { IAuthCommandGateway } from '../shared_ports/IAuthCommandGateway';

@Injectable()
export class UpdateProfilePictureInteractor implements IUpdateProfilePictureInputPort {
  constructor(
    @Inject('IUpdateProfilePictureOutputPort')
    private readonly outputPort: IUpdateProfilePictureOutputPort,
    @Inject('IStorageGateway')
    private readonly storageGateway: IStorageGateway,
    @Inject('IImageProcessorGateway')
    private readonly imageProcessor: IImageProcessorGateway,
    @Inject('IAuthCommandGateway')
    private readonly authCommandGateway: IAuthCommandGateway,
  ) {}

  async execute(request: UpdateProfilePictureRequest): Promise<unknown> {
    try {
      const safeImageBuffer = await this.imageProcessor.sanitizeAndProcess(
        request.fileBuffer,
      );

      const fileName = `${request.userId}-profile.jpg`;

      const savedPath = await this.storageGateway.saveFile(
        fileName,
        safeImageBuffer,
      );

      await this.authCommandGateway.updateProfilePicture(
        request.userId,
        savedPath,
      );

      const response = new UpdateProfilePictureResponse(savedPath);
      return this.outputPort.presentSuccess(response);
    } catch (error) {
      return this.outputPort.presentError(error as Error);
    }
  }
}
