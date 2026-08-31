// src/3_interface_adapters/gateways/auth/BcryptPasswordHasher.ts
import { IPasswordHasher } from '../../../2_use_cases/auth/shared_ports/IPasswordHasher';
import * as bcrypt from 'bcrypt';

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly saltRounds: number) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
