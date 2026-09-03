// src/3_interface_adapters/gateways/auth/AuthQueryGatewayImpl.ts
import { Injectable } from '@nestjs/common';
import { IAuthQueryGateway } from '../../../2_use_cases/auth/shared_ports/IAuthQueryGateway';
import { User } from '../../../1_entities/auth/User';
import { PrismaService } from '../db/PrismaService';

@Injectable()
export class AuthQueryGatewayImpl implements IAuthQueryGateway {
  constructor(private readonly prisma: PrismaService) {}

  public async findUserByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!prismaUser) {
      return null;
    }

    return this.toUser(prismaUser);
  }

  public async findUserById(id: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({ where: { id } });

    if (!prismaUser) {
      return null;
    }

    return this.toUser(prismaUser);
  }

  private toUser(prismaUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    isActive: boolean;
    passwordHash: string | null;
  }): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.firstName,
      prismaUser.lastName,
      prismaUser.isActive,
      prismaUser.passwordHash,
    );
  }
}
