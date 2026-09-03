export interface SessionRecord {
  userId: string;
  expiresAt: Date;
  ip: string;
  userAgent: string;
}

export interface ISessionStore {
  save(
    refreshTokenHash: string,
    session: SessionRecord,
    ttlSeconds: number,
  ): Promise<void>;
  find(refreshTokenHash: string): Promise<SessionRecord | null>;
  delete(refreshTokenHash: string): Promise<void>;
}
