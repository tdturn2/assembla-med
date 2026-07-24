import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { toInvitationPublic } from '../common/serializers';
import { RespondInvitationDto } from './dto/outreach.dto';
import { OutreachService } from './outreach.service';

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Controller('public/invitations')
export class PublicInvitationsController {
  constructor(private readonly outreach: OutreachService) {}

  @Get(':token')
  async get(@Param('token') token: string) {
    const invitation = await this.outreach.getPublicInvitation(token);
    return {
      invitation: {
        ...toInvitationPublic(invitation),
        bodyHtml: invitation.bodyHtml,
        organizationName: invitation.campaign.organization.name,
        congressName: invitation.campaign.congress?.name ?? null,
      },
    };
  }

  @Get(':token/open.gif')
  @Header('Content-Type', 'image/gif')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  async open(@Param('token') token: string, @Res() res: Response) {
    await this.outreach.markOpened(token);
    res.send(PIXEL);
  }

  @Post(':token/respond')
  async respond(
    @Param('token') token: string,
    @Body() dto: RespondInvitationDto,
  ) {
    const invitation = await this.outreach.respond(
      token,
      dto.response,
      dto.message,
    );
    return { invitation: toInvitationPublic(invitation) };
  }
}
