// src/3_interface_adapters/controllers/auth/dto/LoginOAuthDto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginOAuthDto {
  @ApiProperty({
    description: 'Auth provider',
    example: 'google',
  })
  providerName!: 'google' | 'facebook';

  @ApiProperty({
    description: 'The ID token (JWT) provided by Google/Facebook',
  })
  token!: string;
}
