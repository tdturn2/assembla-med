import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendeeKind,
  AttendeeRsvpStatus,
  EngagementType,
  MeetingRequestStatus,
  Prisma,
} from '@prisma/client';
import { AppointmentsService } from '../appointments/appointments.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateMeetingRequestDto,
  MeetingRequestAttendeeInputDto,
  ScheduleMeetingRequestDto,
  UpdateMeetingRequestDto,
} from './dto/meeting-requests.dto';

const meetingRequestInclude = {
  congress: true,
  appointment: {
    include: {
      kol: true,
      congress: true,
      room: true,
      attendees: { include: { kol: true } },
    },
  },
  attendees: { include: { kol: true }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.MeetingRequestInclude;

@Injectable()
export class MeetingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly appointments: AppointmentsService,
  ) {}

  list(
    organizationId: string,
    filters?: { congressId?: string; status?: MeetingRequestStatus },
  ) {
    return this.prisma.meetingRequest.findMany({
      where: {
        organizationId,
        congressId: filters?.congressId,
        status: filters?.status,
      },
      include: meetingRequestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, requestId: string) {
    const request = await this.prisma.meetingRequest.findFirst({
      where: { id: requestId, organizationId },
      include: meetingRequestInclude,
    });
    if (!request) {
      throw new NotFoundException('Meeting request not found');
    }
    return request;
  }

  async create(
    organizationId: string,
    userId: string,
    data: CreateMeetingRequestDto,
    ipAddress?: string,
  ) {
    const congress = await this.prisma.congress.findFirst({
      where: { id: data.congressId, organizationId },
    });
    if (!congress) {
      throw new NotFoundException('Congress not found');
    }

    const engagementType = data.engagementType ?? EngagementType.meeting;
    const isContracted =
      data.isContracted ?? engagementType === EngagementType.contracted_talk;

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.meetingRequest.create({
        data: {
          organizationId,
          congressId: data.congressId,
          createdById: userId,
          engagementType,
          isContracted,
          needsCda: data.needsCda ?? false,
          topic: data.topic?.trim() || null,
          informalTopicPreset: data.informalTopicPreset?.trim() || null,
          contractObjective: data.contractObjective?.trim() || null,
          requestedDurationMinutes: data.requestedDurationMinutes ?? 30,
          avNeeded: data.avNeeded ?? false,
          meetingOwnerName: data.meetingOwnerName?.trim() || null,
          meetingOwnerEmail: data.meetingOwnerEmail?.trim() || null,
          meetingOwnerPhone: data.meetingOwnerPhone?.trim() || null,
          meetingOwnerFunctionalArea:
            data.meetingOwnerFunctionalArea?.trim() || null,
          budgetApprover: data.budgetApprover?.trim() || null,
          costCenter: data.costCenter?.trim() || null,
          productTags: (data.productTags || [])
            .map((t) => t.trim())
            .filter(Boolean),
          cdaScope: data.cdaScope?.trim() || null,
          cdaStage: data.cdaStage?.trim() || null,
          comments: data.comments?.trim() || null,
          schedulingNotes: data.schedulingNotes?.trim() || null,
          contractNotes: data.contractNotes?.trim() || null,
        },
      });

      await this.replaceAttendees(
        tx,
        organizationId,
        created.id,
        data.attendees || [],
      );

      return tx.meetingRequest.findUniqueOrThrow({
        where: { id: created.id },
        include: meetingRequestInclude,
      });
    });

    await this.audit.log({
      action: 'meeting_request.create',
      userId,
      organizationId,
      entityType: 'meeting_request',
      entityId: request.id,
      ipAddress,
      metadata: {
        congressId: request.congressId,
        status: request.status,
        engagementType: request.engagementType,
      },
    });

    return request;
  }

  async update(
    organizationId: string,
    requestId: string,
    userId: string,
    data: UpdateMeetingRequestDto,
    ipAddress?: string,
  ) {
    const existing = await this.get(organizationId, requestId);
    if (
      existing.status === MeetingRequestStatus.scheduled &&
      data.status &&
      data.status !== MeetingRequestStatus.scheduled
    ) {
      throw new BadRequestException(
        'Scheduled requests cannot change status; cancel the appointment instead',
      );
    }
    if (
      existing.status === MeetingRequestStatus.withdrawn &&
      data.status &&
      data.status !== MeetingRequestStatus.withdrawn
    ) {
      throw new BadRequestException('Withdrawn requests cannot be reopened yet');
    }

    const nextStatus = data.status ?? existing.status;
    if (
      nextStatus === MeetingRequestStatus.withdrawn &&
      !data.withdrawnReason &&
      !existing.withdrawnReason
    ) {
      throw new BadRequestException('withdrawnReason is required to withdraw');
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.meetingRequest.update({
        where: { id: requestId },
        data: {
          status: data.status,
          engagementType: data.engagementType,
          isContracted: data.isContracted,
          needsCda: data.needsCda,
          topic:
            data.topic === undefined
              ? undefined
              : data.topic?.trim() || null,
          informalTopicPreset:
            data.informalTopicPreset === undefined
              ? undefined
              : data.informalTopicPreset?.trim() || null,
          contractObjective:
            data.contractObjective === undefined
              ? undefined
              : data.contractObjective?.trim() || null,
          requestedDurationMinutes: data.requestedDurationMinutes,
          avNeeded: data.avNeeded,
          meetingOwnerName:
            data.meetingOwnerName === undefined
              ? undefined
              : data.meetingOwnerName?.trim() || null,
          meetingOwnerEmail:
            data.meetingOwnerEmail === undefined
              ? undefined
              : data.meetingOwnerEmail?.trim() || null,
          meetingOwnerPhone:
            data.meetingOwnerPhone === undefined
              ? undefined
              : data.meetingOwnerPhone?.trim() || null,
          meetingOwnerFunctionalArea:
            data.meetingOwnerFunctionalArea === undefined
              ? undefined
              : data.meetingOwnerFunctionalArea?.trim() || null,
          budgetApprover:
            data.budgetApprover === undefined
              ? undefined
              : data.budgetApprover?.trim() || null,
          costCenter:
            data.costCenter === undefined
              ? undefined
              : data.costCenter?.trim() || null,
          productTags: data.productTags
            ? data.productTags.map((t) => t.trim()).filter(Boolean)
            : undefined,
          cdaScope:
            data.cdaScope === undefined
              ? undefined
              : data.cdaScope?.trim() || null,
          cdaStage:
            data.cdaStage === undefined
              ? undefined
              : data.cdaStage?.trim() || null,
          comments:
            data.comments === undefined
              ? undefined
              : data.comments?.trim() || null,
          schedulingNotes:
            data.schedulingNotes === undefined
              ? undefined
              : data.schedulingNotes?.trim() || null,
          contractNotes:
            data.contractNotes === undefined
              ? undefined
              : data.contractNotes?.trim() || null,
          withdrawnReason:
            data.withdrawnReason === undefined
              ? undefined
              : data.withdrawnReason?.trim() || null,
        },
      });

      if (data.attendees) {
        await this.replaceAttendees(
          tx,
          organizationId,
          updated.id,
          data.attendees,
        );
      }

      return tx.meetingRequest.findUniqueOrThrow({
        where: { id: updated.id },
        include: meetingRequestInclude,
      });
    });

    await this.audit.log({
      action: 'meeting_request.update',
      userId,
      organizationId,
      entityType: 'meeting_request',
      entityId: request.id,
      ipAddress,
      metadata: { status: request.status },
    });

    return request;
  }

  async schedule(
    organizationId: string,
    requestId: string,
    userId: string,
    data: ScheduleMeetingRequestDto,
    ipAddress?: string,
  ) {
    const request = await this.get(organizationId, requestId);
    if (request.status === MeetingRequestStatus.withdrawn) {
      throw new BadRequestException('Cannot schedule a withdrawn request');
    }
    if (request.appointmentId) {
      throw new BadRequestException('Request already has an appointment');
    }

    const attendees = request.attendees || [];
    const primary =
      attendees.find((a) => a.isPrimary) ||
      attendees.find((a) => a.kind === AttendeeKind.kol) ||
      attendees[0];

    const title =
      data.title?.trim() ||
      request.topic?.trim() ||
      (primary ? `Meeting with ${primary.name}` : 'Congress meeting');

    const noteParts = [
      request.comments,
      request.schedulingNotes,
      request.needsCda ? 'Needs CDA onsite or confirmation of existing CDA.' : null,
      request.avNeeded ? 'AV / video display needed.' : null,
    ].filter(Boolean);

    const appointmentAttendees = attendees.map((a, index) => ({
      kind: a.kind,
      kolId: a.kolId || undefined,
      name: a.name,
      email: a.email || undefined,
      isPrimary: a.isPrimary || (!attendees.some((x) => x.isPrimary) && index === 0),
      rsvpStatus: AttendeeRsvpStatus.invited,
    }));

    const appointment = await this.appointments.create(
      organizationId,
      userId,
      {
        congressId: request.congressId,
        kolId: primary?.kolId || undefined,
        roomId: data.roomId,
        title,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        engagementType: request.engagementType,
        isContracted: request.isContracted,
        contractNotes:
          request.contractObjective || request.contractNotes || undefined,
        notes: noteParts.length ? noteParts.join('\n\n') : undefined,
        attendees: appointmentAttendees.length
          ? appointmentAttendees
          : undefined,
      },
      ipAddress,
    );

    const updated = await this.prisma.meetingRequest.update({
      where: { id: requestId },
      data: {
        status: MeetingRequestStatus.scheduled,
        appointmentId: appointment.id,
      },
      include: meetingRequestInclude,
    });

    await this.audit.log({
      action: 'meeting_request.schedule',
      userId,
      organizationId,
      entityType: 'meeting_request',
      entityId: requestId,
      ipAddress,
      metadata: { appointmentId: appointment.id },
    });

    return { meetingRequest: updated, appointment };
  }

  private async replaceAttendees(
    tx: Prisma.TransactionClient,
    organizationId: string,
    meetingRequestId: string,
    inputs: MeetingRequestAttendeeInputDto[],
  ) {
    await tx.meetingRequestAttendee.deleteMany({
      where: { meetingRequestId },
    });

    const explicitPrimary = inputs.some((a) => a.isPrimary === true);
    const defaultPrimaryIndex = (() => {
      const kolIdx = inputs.findIndex((a) => a.kind === AttendeeKind.kol);
      return kolIdx >= 0 ? kolIdx : 0;
    })();

    for (const [index, input] of inputs.entries()) {
      let name = input.name?.trim() || '';
      let email = input.email?.trim() || null;
      let kolId = input.kolId || null;

      if (kolId) {
        const kol = await tx.kol.findFirst({
          where: { id: kolId, organizationId },
        });
        if (!kol) {
          throw new NotFoundException(`KOL not found: ${kolId}`);
        }
        name = name || kol.name;
        email = email || kol.email;
      }

      if (!name) {
        throw new BadRequestException(
          'Each attendee needs a name or linked KOL',
        );
      }

      const isPrimary = explicitPrimary
        ? input.isPrimary === true
        : index === defaultPrimaryIndex;

      await tx.meetingRequestAttendee.create({
        data: {
          organizationId,
          meetingRequestId,
          kind: input.kind,
          kolId,
          name,
          email,
          country: input.country?.trim() || null,
          isPrimary,
          notes: input.notes?.trim() || null,
        },
      });
    }
  }
}
