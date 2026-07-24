import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService, SESSION_COOKIE } from '../session.service';

export type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
  sessionToken?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.sessions.findValidSession(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    req.user = { id: session.user.id, email: session.user.email };
    req.sessionToken = token;
    return true;
  }
}
