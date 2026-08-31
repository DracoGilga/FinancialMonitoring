// src/2_use_cases/auth/shared_ports/IAuthCommandGateway.ts
import { User } from '../../../1_entities/auth/User';
import { OAuthAccount } from '../../../1_entities/auth/OAuthAccount';
import { Session } from '../../../1_entities/auth/Session';

export interface IAuthCommandGateway {
  saveSession(session: Session): Promise<void>;
  saveNewOAuthUser(user: User, oauthAccount: OAuthAccount): Promise<void>;
  saveNewUser(user: User): Promise<void>;
}
