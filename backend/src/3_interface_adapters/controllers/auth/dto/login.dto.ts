// src/3_interface_adapters/controllers/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'cesar@email.com',
    description: 'user email for login',
  })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    example: 'miPassword123',
    description: 'user password for login',
  })
  @IsString()
  @MaxLength(32)
  password!: string;
}
