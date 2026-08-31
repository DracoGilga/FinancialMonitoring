// src/3_interface_adapters/controllers/auth/AuthController.ts
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { ILoginInputPort } from '../../../2_use_cases/auth/login_manual/ILoginInputPort';
import { LoginManualRequest } from '../../../2_use_cases/auth/login_manual/LoginManualRequest';
import { LoginDto } from './dto/login.dto';
import type { IRegisterManualInputPort } from '../../../2_use_cases/auth/register_manual/IRegisterManualInputPort';
import { RegisterManualRequest } from '../../../2_use_cases/auth/register_manual/RegisterManualRequest';
import { RegisterDto } from './dto/RegisterDto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('ILoginInputPort')
    private readonly loginManualUseCase: ILoginInputPort,

    @Inject('IRegisterManualInputPort')
    private readonly registerManualUseCase: IRegisterManualInputPort,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Inicia sesión de forma manual con email y contraseña',
  })
  @ApiResponse({ status: 201, description: 'Sesión creada exitosamente' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() body: LoginDto) {
    const request = new LoginManualRequest(body.email, body.password);
    const response = await this.loginManualUseCase.execute(request);

    if (response.status === 'error') {
      throw new HttpException(response.message, HttpStatus.UNAUTHORIZED);
    }

    return response;
  }

  @Post('register')
  @ApiOperation({
    summary: 'Crea una cuenta nueva con correo y contraseña',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Error en validación o correo duplicado',
  })
  async register(@Body() body: RegisterDto) {
    const request: RegisterManualRequest = {
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    };

    const response = await this.registerManualUseCase.execute(request);

    if (response.status === 'error') {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }

    return response;
  }
}
