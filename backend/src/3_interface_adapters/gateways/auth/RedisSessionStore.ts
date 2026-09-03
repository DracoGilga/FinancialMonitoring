import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import type {
  ISessionStore,
  SessionRecord,
} from '../../../2_use_cases/auth/shared_ports/ISessionStore';

@Injectable()
export class RedisSessionStore
  implements ISessionStore, OnModuleInit, OnModuleDestroy
{
  private readonly client: RedisClientType = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'redis',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
  });

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async save(
    refreshTokenHash: string,
    session: SessionRecord,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      this.key(refreshTokenHash),
      JSON.stringify({
        userId: session.userId,
        expiresAt: session.expiresAt.toISOString(),
        ip: session.ip,
        userAgent: session.userAgent,
      }),
      { EX: ttlSeconds },
    );
  }

  async find(refreshTokenHash: string): Promise<SessionRecord | null> {
    const value = await this.client.get(this.key(refreshTokenHash));
    if (!value) return null;

    const parsed = JSON.parse(value) as {
      userId: string;
      expiresAt: string;
      ip: string;
      userAgent: string;
    };

    return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
  }

  async delete(refreshTokenHash: string): Promise<void> {
    await this.client.del(this.key(refreshTokenHash));
  }

  private key(refreshTokenHash: string): string {
    return `auth:session:${refreshTokenHash}`;
  }
}
