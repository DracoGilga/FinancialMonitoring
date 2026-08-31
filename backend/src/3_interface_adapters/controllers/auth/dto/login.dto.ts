// src/3_interface_adapters/controllers/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'cesar@email.com',
    description: 'user email for login',
  })
  email!: string;

  @ApiProperty({
    example: 'miPassword123',
    description: 'user password for login',
  })
  password!: string;
}
