// src/3_interface_adapters/controllers/auth/dto/RegisterDto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'cesar.dev@email.com' })
  @IsEmail({}, { message: 'this is not a valid email' })
  email!: string;

  @ApiProperty({ example: 'paswword' })
  @IsString()
  @MinLength(6, { message: 'the password must be at least 6 characters long' })
  password!: string;

  @ApiProperty({ example: 'César' })
  @IsString()
  @IsNotEmpty({ message: 'the first name is required' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'González' })
  @IsString()
  @IsOptional()
  lastName?: string;
}
