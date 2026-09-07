// src/3_interface_adapters/controllers/auth/ProfilePictureController.ts
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import 'multer';
import { AuthenticatedRequest, JwtAuthGuard } from './guards/JwtAuthGuard';
import { IUpdateProfilePictureInputPort } from '../../../2_use_cases/auth/update_profile_picture/IUpdateProfilePictureInputPort';
import { UpdateProfilePictureRequest } from '../../../2_use_cases/auth/update_profile_picture/UpdateProfilePictureRequest';
import { IGetProfilePictureInputPort } from '../../../2_use_cases/auth/get_profile_picture/IGetProfilePictureInputPort';
import { GetProfilePictureRequest } from '../../../2_use_cases/auth/get_profile_picture/GetProfilePictureRequest';
import { ProfilePictureUploadDto } from './dto/ProfilePictureUploadDto';

@ApiTags('Auth')
@Controller('auth/profile-picture')
export class ProfilePictureController {
  constructor(
    @Inject('IUpdateProfilePictureInputPort')
    private readonly updateProfilePictureUseCase: IUpdateProfilePictureInputPort,

    @Inject('IGetProfilePictureInputPort')
    private readonly getProfilePictureUseCase: IGetProfilePictureInputPort,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload the authenticated user profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ProfilePictureUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Profile picture uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid image or file size' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 0,
      },
    }),
  )
  async uploadFile(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 40 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const userId = req.user.userId;

    const request = new UpdateProfilePictureRequest(userId, file.buffer);

    return await this.updateProfilePictureUseCase.execute(request);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile picture returned as an image',
  })
  @ApiResponse({ status: 404, description: 'Profile picture not found' })
  async getProfilePicture(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const result = await this.getProfilePictureUseCase.execute(
      new GetProfilePictureRequest(req.user.userId),
    );

    const userNamePublico = 'User';

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `inline; filename="${userNamePublico}-foto.jpg"`,
    });

    res.send(result.fileBuffer);
  }
}
