import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendeeKind,
  AttendeeRsvpStatus,
  CampaignStatus,
  EngagementType,
  InvitationStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { MailgunService } from '../mail/mailgun.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailgun: MailgunService,
    private readonly audit: AuditService,
  ) {}

  createTemplate(
    organizationId: string,
    userId: string,
    data: { name: string; subject: string; bodyHtml: string },
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.invitationTemplate.create({
        data: {
          organizationId,
          name: data.name.trim(),
          subject: data.subject.trim(),
          bodyHtml: data.bodyHtml,
        },
      });
      await this.audit.log({
        action: 'outreach.template.create',
        userId,
        organizationId,
        entityType: 'invitation_template',
        entityId: template.id,
        ipAddress,
      });
      return template;
    });
  }

  listTemplates(organizationId: string) {
    return this.prisma.invitationTemplate.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateTemplate(
    organizationId: string,
    templateId: string,
    userId: string,
    data: { name?: string; subject?: string; bodyHtml?: string },
    ipAddress?: string,
  ) {
    await this.getTemplate(organizationId, templateId);
    const patch: Prisma.InvitationTemplateUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.subject !== undefined) patch.subject = data.subject.trim();
    if (data.bodyHtml !== undefined) patch.bodyHtml = data.bodyHtml;
    const template = await this.prisma.invitationTemplate.update({
      where: { id: templateId },
      data: patch,
    });
    await this.audit.log({
      action: 'outreach.template.update',
      userId,
      organizationId,
      entityType: 'invitation_template',
      entityId: template.id,
      ipAddress,
    });
    return template;
  }

  async getTemplate(organizationId: string, templateId: string) {
    const template = await this.prisma.invitationTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async createCampaign(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      templateId: string;
      congressId?: string;
      kolIds: string[];
      engagementType?: EngagementType;
      isContracted?: boolean;
    },
    ipAddress?: string,
  ) {
    if (!data.kolIds.length) {
      throw new BadRequestException('Select at least one KOL');
    }

    const template = await this.getTemplate(organizationId, data.templateId);
    const congress = data.congressId
      ? await this.prisma.congress.findFirst({
          where: { id: data.congressId, organizationId },
        })
      : null;
    if (data.congressId && !congress) {
      throw new NotFoundException('Congress not found');
    }

    const kols = await this.prisma.kol.findMany({
      where: { organizationId, id: { in: data.kolIds } },
    });
    if (kols.length !== data.kolIds.length) {
      throw new BadRequestException('One or more KOLs were not found');
    }

    const missingEmail = kols.filter((kol) => !kol.email);
    if (missingEmail.length) {
      throw new BadRequestException(
        `KOLs missing email: ${missingEmail.map((k) => k.name).join(', ')}`,
      );
    }

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    const engagementType = data.engagementType ?? EngagementType.meeting;
    const isContracted =
      data.isContracted ?? engagementType === EngagementType.contracted_talk;

    const campaign = await this.prisma.outreachCampaign.create({
      data: {
        organizationId,
        name: data.name.trim(),
        templateId: template.id,
        congressId: congress?.id || null,
        createdById: userId,
        engagementType,
        isContracted,
        invitations: {
          create: kols.map((kol) => {
            const vars = {
              name: kol.name,
              email: kol.email || '',
              institution: kol.institution || '',
              congress: congress?.name || '',
              organization: organization.name,
            };
            return {
              organizationId,
              kolId: kol.id,
              toEmail: kol.email!,
              toName: kol.name,
              subject: renderMerge(template.subject, vars),
              bodyHtml: renderMerge(template.bodyHtml, vars),
              responseToken: randomBytes(24).toString('hex'),
              status: InvitationStatus.pending,
              engagementType,
              isContracted,
            };
          }),
        },
      },
      include: {
        invitations: { include: { kol: true } },
        template: true,
        congress: true,
      },
    });

    await this.audit.log({
      action: 'outreach.campaign.create',
      userId,
      organizationId,
      entityType: 'outreach_campaign',
      entityId: campaign.id,
      ipAddress,
      metadata: {
        kolCount: kols.length,
        engagementType,
        isContracted,
      },
    });

    return campaign;
  }

  listCampaigns(organizationId: string) {
    return this.prisma.outreachCampaign.findMany({
      where: { organizationId },
      include: {
        template: true,
        congress: true,
        _count: { select: { invitations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.outreachCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        template: true,
        congress: true,
        invitations: {
          include: { kol: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async sendCampaign(
    organizationId: string,
    campaignId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (
      campaign.status !== CampaignStatus.draft &&
      campaign.status !== CampaignStatus.sent
    ) {
      // allow resend of failed only via individual - for simplicity allow draft or sent with pending/failed
    }

    await this.prisma.outreachCampaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.sending },
    });

    const webUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:3018';
    const apiUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000/api';
    let sent = 0;
    let failed = 0;

    for (const invitation of campaign.invitations) {
      if (
        invitation.status === InvitationStatus.sent ||
        invitation.status === InvitationStatus.opened ||
        invitation.status === InvitationStatus.responded ||
        invitation.status === InvitationStatus.declined
      ) {
        continue;
      }

      const rsvpUrl = `${webUrl}/rsvp/${invitation.responseToken}`;
      const openPixel = `${apiUrl}/public/invitations/${invitation.responseToken}/open.gif`;
      const html = `${invitation.bodyHtml}
<p><a href="${rsvpUrl}">Respond to this invitation</a></p>
<img src="${openPixel}" alt="" width="1" height="1" style="display:none" />`;

      try {
        const result = await this.mailgun.send({
          to: invitation.toEmail,
          subject: invitation.subject,
          html,
          tags: ['assembla-med', 'outreach', campaign.id],
        });

        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.sent,
            sentAt: new Date(),
            providerMessageId: result.id,
            errorMessage: null,
            bodyHtml: html,
          },
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.failed,
            errorMessage:
              error instanceof Error ? error.message : 'Send failed',
          },
        });
      }
    }

    const updated = await this.prisma.outreachCampaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.sent,
        sentAt: new Date(),
      },
      include: {
        template: true,
        congress: true,
        invitations: { include: { kol: true } },
      },
    });

    await this.audit.log({
      action: 'outreach.campaign.send',
      userId,
      organizationId,
      entityType: 'outreach_campaign',
      entityId: campaign.id,
      ipAddress,
      metadata: { sent, failed },
    });

    return { campaign: updated, sent, failed };
  }

  async markOpened(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { responseToken: token },
    });
    if (!invitation) {
      return null;
    }
    if (
      invitation.status === InvitationStatus.sent ||
      invitation.status === InvitationStatus.pending
    ) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.opened,
          openedAt: invitation.openedAt ?? new Date(),
        },
      });
    } else if (!invitation.openedAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { openedAt: new Date() },
      });
    }
    return invitation;
  }

  async getPublicInvitation(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { responseToken: token },
      include: {
        kol: true,
        campaign: { include: { congress: true, organization: true } },
      },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    return invitation;
  }

  async respond(
    token: string,
    response: 'accepted' | 'declined',
    message?: string,
  ) {
    const invitation = await this.getPublicInvitation(token);
    if (
      invitation.status === InvitationStatus.responded ||
      invitation.status === InvitationStatus.declined
    ) {
      return invitation;
    }

    const status =
      response === 'accepted'
        ? InvitationStatus.responded
        : InvitationStatus.declined;

    let appointmentId = invitation.appointmentId;
    if (response === 'accepted' && invitation.campaign.congressId) {
      const start = new Date();
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 24);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const engagementType =
        invitation.engagementType ?? invitation.campaign.engagementType;
      const isContracted =
        invitation.isContracted || invitation.campaign.isContracted;
      const appointment = await this.prisma.appointment.create({
        data: {
          organizationId: invitation.organizationId,
          congressId: invitation.campaign.congressId,
          kolId: invitation.kolId,
          title: `Meeting with ${invitation.toName}`,
          startTime: start,
          endTime: end,
          engagementType,
          isContracted,
          notes: message?.trim() || 'Created from invitation acceptance',
          checkInCode: randomBytes(4).toString('hex').toUpperCase(),
          attendees: {
            create: {
              organizationId: invitation.organizationId,
              kind: AttendeeKind.kol,
              kolId: invitation.kolId,
              name: invitation.toName,
              email: invitation.toEmail,
              rsvpStatus: AttendeeRsvpStatus.accepted,
              isPrimary: true,
            },
          },
        },
      });
      appointmentId = appointment.id;
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status,
        respondedAt: new Date(),
        responseText: message?.trim() || null,
        appointmentId,
      },
      include: {
        kol: true,
        campaign: { include: { congress: true, organization: true } },
        appointment: true,
      },
    });

    await this.audit.log({
      action: 'outreach.invitation.respond',
      organizationId: invitation.organizationId,
      entityType: 'invitation',
      entityId: invitation.id,
      metadata: { response, appointmentId },
    });

    return updated;
  }
}

function renderMerge(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });
}
