// src/3_interface_adapters/controllers/auth/dto/ProfilePictureUploadDto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProfilePictureUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile picture in PNG or JPEG format',
  })
  file!: string;
}
