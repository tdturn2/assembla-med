import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async register(email: string, password: string, ipAddress?: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
      },
    });

    await this.audit.log({
      action: 'auth.register',
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    const { token, session } = await this.sessions.createSession(user.id);

    await this.audit.log({
      action: 'auth.login',
      userId: user.id,
      entityType: 'session',
      entityId: session.id,
      ipAddress,
      metadata: { via: 'register' },
    });

    return { user, token };
  }

  async login(email: string, password: string, ipAddress?: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { token, session } = await this.sessions.createSession(user.id);

    await this.audit.log({
      action: 'auth.login',
      userId: user.id,
      entityType: 'session',
      entityId: session.id,
      ipAddress,
    });

    return { user, token };
  }

  async logout(token: string | undefined, userId?: string, ipAddress?: string) {
    if (token) {
      await this.sessions.revokeByToken(token);
    }

    if (userId) {
      await this.audit.log({
        action: 'auth.logout',
        userId,
        ipAddress,
      });
    }
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim();
    }
    return req.ip;
  }
}
