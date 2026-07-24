import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import {
  toCampaignPublic,
  toInvitationPublic,
  toTemplatePublic,
} from '../common/serializers';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import {
  CreateCampaignDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/outreach.dto';
import { OutreachService } from './outreach.service';

@Controller('organizations/:orgId/outreach')
@UseGuards(AuthGuard, OrgMemberGuard)
export class OutreachController {
  constructor(
    private readonly outreach: OutreachService,
    private readonly auth: AuthService,
  ) {}

  @Post('templates')
  @Roles('org_admin', 'rep')
  async createTemplate(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTemplateDto,
    @Req() req: AuthRequest,
  ) {
    const template = await this.outreach.createTemplate(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { template: toTemplatePublic(template) };
  }

  @Get('templates')
  async listTemplates(@Param('orgId') orgId: string) {
    const templates = await this.outreach.listTemplates(orgId);
    return { templates: templates.map(toTemplatePublic) };
  }

  @Patch('templates/:templateId')
  @Roles('org_admin', 'rep')
  async updateTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTemplateDto,
    @Req() req: AuthRequest,
  ) {
    const template = await this.outreach.updateTemplate(
      orgId,
      templateId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { template: toTemplatePublic(template) };
  }

  @Post('campaigns')
  @Roles('org_admin', 'rep')
  async createCampaign(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCampaignDto,
    @Req() req: AuthRequest,
  ) {
    const campaign = await this.outreach.createCampaign(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { campaign: toCampaignPublic(campaign) };
  }

  @Get('campaigns')
  async listCampaigns(@Param('orgId') orgId: string) {
    const campaigns = await this.outreach.listCampaigns(orgId);
    return { campaigns: campaigns.map(toCampaignPublic) };
  }

  @Get('campaigns/:campaignId')
  async getCampaign(
    @Param('orgId') orgId: string,
    @Param('campaignId') campaignId: string,
  ) {
    const campaign = await this.outreach.getCampaign(orgId, campaignId);
    return { campaign: toCampaignPublic(campaign) };
  }

  @Post('campaigns/:campaignId/send')
  @Roles('org_admin', 'rep')
  async sendCampaign(
    @Param('orgId') orgId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
    @Req() req: AuthRequest,
  ) {
    const result = await this.outreach.sendCampaign(
      orgId,
      campaignId,
      user.id,
      this.auth.clientIp(req),
    );
    return {
      campaign: toCampaignPublic(result.campaign),
      sent: result.sent,
      failed: result.failed,
      invitations: result.campaign.invitations.map(toInvitationPublic),
    };
  }
}
