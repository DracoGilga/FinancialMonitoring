// src/3_interface_adapters/gateways/auth/JwtTokenGenerator.ts
import { ITokenGenerator } from '../../../2_use_cases/auth/shared_ports/ITokenGenerator';
import * as jwt from 'jsonwebtoken';

export class JwtTokenGenerator implements ITokenGenerator {
  constructor(
    private readonly secret: string,
    private readonly expiresInMinutes: number,
  ) {}

  generateAccessToken(userId: string, email: string): string {
    return jwt.sign({ sub: userId, email }, this.secret, {
      expiresIn: `${this.expiresInMinutes}m`,
    });
  }
}
