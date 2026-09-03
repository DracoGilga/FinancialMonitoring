// src/3_interface_adapters/controllers/auth/dto/RegisterDto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'cesar.dev@email.com' })
  @IsEmail({}, { message: 'this is not a valid email' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Password1!' })
  @IsString()
  @MinLength(8, { message: 'the password must be at least 8 characters long' })
  @MaxLength(32, { message: 'the password must be at most 32 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).+$/, {
    message:
      'the password must include uppercase, lowercase, number and special character',
  })
  password!: string;

  @ApiProperty({ example: 'César' })
  @IsString()
  @IsNotEmpty({ message: 'the first name is required' })
  @MaxLength(30, { message: 'the first name must be at most 30 characters' })
  @Matches(/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u, {
    message: 'the first name contains invalid characters',
  })
  firstName!: string;

  @ApiPropertyOptional({ example: 'González' })
  @IsString()
  @IsOptional()
  @MaxLength(60, { message: 'the last name must be at most 60 characters' })
  @Matches(/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u, {
    message: 'the last name contains invalid characters',
  })
  lastName?: string;
}
