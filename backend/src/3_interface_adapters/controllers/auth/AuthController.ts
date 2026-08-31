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
import type { ILoginOAuthInputPort } from '../../../2_use_cases/auth/login_oauth/ILoginOAuthInputPort';
import { LoginOAuthRequest } from '../../../2_use_cases/auth/login_oauth/LoginOAuthRequest';
import { LoginOAuthDto } from './dto/LoginOAuthDto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('ILoginInputPort')
    private readonly loginManualUseCase: ILoginInputPort,

    @Inject('IRegisterManualInputPort')
    private readonly registerManualUseCase: IRegisterManualInputPort,

    @Inject('ILoginOAuthInputPort')
    private readonly loginOAuthUseCase: ILoginOAuthInputPort,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Manually log in with email and password',
  })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
    summary: 'Create a new account with email and password',
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or duplicate email',
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

  @Post('oauth/login')
  @ApiOperation({
    summary: 'Log in or register a user using Google or Facebook',
  })
  @ApiResponse({ status: 201, description: 'OAuth authentication successful' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired provider token',
  })
  async loginOAuth(@Body() body: LoginOAuthDto) {
    const request = new LoginOAuthRequest(body.providerName, body.token);

    const response = await this.loginOAuthUseCase.execute(request);

    return response;
  }
}
