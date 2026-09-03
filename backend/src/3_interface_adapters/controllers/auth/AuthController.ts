// src/3_interface_adapters/controllers/auth/AuthController.ts
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { RefreshTokenService } from '../../../2_use_cases/auth/refresh/RefreshTokenService';

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

    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Manually log in with email and password',
  })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginRequest = new LoginManualRequest(
      body.email,
      body.password,
      request.ip || 'unknown',
      request.get('user-agent') || 'unknown',
    );
    const result = await this.loginManualUseCase.execute(loginRequest);

    if (result.status === 'error') {
      throw new HttpException(result.message, HttpStatus.UNAUTHORIZED);
    }

    this.setRefreshCookie(response, result.data.refreshToken);
    return {
      status: result.status,
      data: { token: result.data.token, user_name: result.data.user_name },
    };
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
  async loginOAuth(
    @Body() body: LoginOAuthDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginRequest = new LoginOAuthRequest(
      body.providerName,
      body.token,
      request.ip || 'unknown',
      request.get('user-agent') || 'unknown',
    );

    const result = await this.loginOAuthUseCase.execute(loginRequest);

    this.setRefreshCookie(response, result.data.refreshToken);
    return {
      status: result.status,
      data: {
        token: result.data.token,
        user_name: result.data.user_name,
        is_new_user: result.data.is_new_user,
      },
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an access token using the secure cookie' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token context' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readCookie(request, 'refresh_token');

    try {
      const result = await this.refreshTokenService.refresh({
        token: refreshToken,
        ip: request.ip || 'unknown',
        userAgent: request.get('user-agent') || 'unknown',
      });
      this.setRefreshCookie(response, result.refreshToken);
      return { status: 'success', data: { token: result.accessToken } };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Unauthorized',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private readCookie(request: Request, name: string): string {
    const header = request.headers.cookie || '';
    const cookie = header
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
  }
}
