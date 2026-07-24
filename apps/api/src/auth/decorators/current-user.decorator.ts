import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.user;
  },
);
