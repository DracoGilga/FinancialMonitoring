// src/3_interface_adapters/controllers/auth/dto/UpdateUserDto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const namePattern = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'cesar.dev@email.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: 'César' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(namePattern)
  firstName?: string;

  @ApiPropertyOptional({ example: 'González', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(namePattern)
  lastName?: string | null;
}
