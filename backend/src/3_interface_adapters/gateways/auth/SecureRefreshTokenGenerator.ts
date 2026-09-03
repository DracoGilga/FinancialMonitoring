import { createHash, randomBytes } from 'node:crypto';
import type { IRefreshTokenGenerator } from '../../../2_use_cases/auth/shared_ports/IRefreshTokenGenerator';

export class SecureRefreshTokenGenerator implements IRefreshTokenGenerator {
  generate(): string {
    return randomBytes(48).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
