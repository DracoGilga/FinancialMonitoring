// src/2_use_cases/auth/shared_ports/IAuthQueryGateway.ts
import { User } from '../../../1_entities/auth/User';

export interface IAuthQueryGateway {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
}
