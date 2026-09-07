// src/2_use_cases/auth/shared_ports/IRefreshTokenGenerator.ts
export interface IRefreshTokenGenerator {
  generate(): string;
  hash(token: string): string;
}
