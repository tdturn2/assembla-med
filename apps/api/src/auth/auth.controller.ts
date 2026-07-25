import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { toMeResponse, toUserPublic } from '../common/serializers';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthGuard, type AuthRequest } from './guards/auth.guard';
import { SESSION_COOKIE, SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.register(
      dto.email,
      dto.password,
      this.auth.clientIp(req),
    );
    this.setSessionCookie(res, token);
    return { user: toUserPublic(user) };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.login(
      dto.email,
      dto.password,
      this.auth.clientIp(req),
    );
    this.setSessionCookie(res, token);
    return { user: toUserPublic(user) };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(
      req.sessionToken,
      req.user?.id,
      this.auth.clientIp(req),
    );
    res.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: { id: string }) {
    const full = await this.auth.me(user.id);
    return toMeResponse(full);
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, this.sessions.cookieOptions());
  }
}
