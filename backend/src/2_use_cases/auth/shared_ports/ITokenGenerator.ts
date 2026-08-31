// src/2_use_cases/auth/shared_ports/ITokenGenerator.ts
export interface ITokenGenerator {
  generateAccessToken(userId: string, email: string): string;
}
