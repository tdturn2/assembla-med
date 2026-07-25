import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_COOKIE = 'am_session';
const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? 14);

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  createToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  expiresAt(from = new Date()): Date {
    const expires = new Date(from);
    expires.setDate(expires.getDate() + SESSION_DAYS);
    return expires;
  }

  async createSession(userId: string) {
    const token = this.createToken();
    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: this.expiresAt(),
      },
    });

    return { token, session };
  }

  async findValidSession(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return session;
  }

  async revokeByToken(token: string) {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }

  cookieOptions() {
    const secure = process.env.COOKIE_SECURE === 'true';
    // Prefer Lax: Console proxies /api through the web host (first-party cookie).
    // SameSite=None only if COOKIE_SAMESITE=none (legacy cross-origin API host).
    const sameSite =
      process.env.COOKIE_SAMESITE === 'none'
        ? ('none' as const)
        : ('lax' as const);
    return {
      httpOnly: true,
      sameSite,
      secure: sameSite === 'none' ? true : secure,
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    };
  }
}
