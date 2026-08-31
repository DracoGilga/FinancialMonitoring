// src/2_use_cases/auth/shared_ports/IPasswordHasher.ts
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
