import type {
  Appointment,
  AppointmentAttendee,
  CheckIn,
  Congress,
  CongressGuide,
  Invitation,
  InvitationTemplate,
  Kol,
  MeetingRequest,
  MeetingRequestAttendee,
  Membership,
  Organization,
  OutreachCampaign,
  Room,
  User,
} from '@prisma/client';
import type {
  AppointmentAttendeePublic,
  AppointmentPublic,
  CampaignPublic,
  CheckInPublic,
  CongressGuidePublic,
  CongressPublic,
  DisclosureItemPublic,
  InvitationPublic,
  InvitationTemplatePublic,
  KolPublic,
  MeetingRequestAttendeePublic,
  MeetingRequestPublic,
  MeResponse,
  MembershipPublic,
  OrganizationPublic,
  RoomPublic,
  UserPublic,
} from '@assembla-med/shared';

type MembershipWithOrg = Membership & { organization: Organization };
type MembershipWithUser = Membership & { user: User };
type AppointmentAttendeeWithRelations = AppointmentAttendee & {
  kol?: Kol | null;
};
type AppointmentWithRelations = Appointment & {
  kol?: Kol | null;
  congress?: Congress | null;
  room?: Room | null;
  attendees?: AppointmentAttendeeWithRelations[];
};
type CheckInWithRelations = CheckIn & {
  appointment?: AppointmentWithRelations;
};

export function toRoomPublic(
  room: Room & {
    available?: boolean;
    conflictingAppointmentId?: string | null;
  },
): RoomPublic {
  return {
    id: room.id,
    organizationId: room.organizationId,
    congressId: room.congressId,
    title: room.title,
    sitting: room.sitting,
    capacity: room.capacity,
    hasAv: room.hasAv,
    avNotes: room.avNotes,
    layout: room.layout,
    supplyList: room.supplyList,
    notes: room.notes,
    createdAt: room.createdAt.toISOString(),
    ...(room.available !== undefined && { available: room.available }),
    ...(room.conflictingAppointmentId !== undefined && {
      conflictingAppointmentId: room.conflictingAppointmentId,
    }),
  };
}

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toOrganizationPublic(org: Organization): OrganizationPublic {
  return {
    id: org.id,
    name: org.name,
    subscriptionTier: org.subscriptionTier,
    createdAt: org.createdAt.toISOString(),
  };
}

export function toMembershipPublic(
  membership: MembershipWithOrg | MembershipWithUser | Membership,
): MembershipPublic {
  const base: MembershipPublic = {
    id: membership.id,
    role: membership.role,
    organizationId: membership.organizationId,
    userId: membership.userId,
    createdAt: membership.createdAt.toISOString(),
  };

  if ('organization' in membership && membership.organization) {
    base.organization = toOrganizationPublic(membership.organization);
  }

  if ('user' in membership && membership.user) {
    base.user = toUserPublic(membership.user);
  }

  return base;
}

export function toMeResponse(
  user: User & { memberships: MembershipWithOrg[] },
): MeResponse {
  return {
    user: toUserPublic(user),
    memberships: user.memberships.map(toMembershipPublic),
  };
}

export function toCongressPublic(congress: Congress): CongressPublic {
  return {
    id: congress.id,
    organizationId: congress.organizationId,
    name: congress.name,
    cventId: congress.cventId,
    companyContactName: congress.companyContactName,
    companyContactEmail: congress.companyContactEmail,
    websiteUrl: congress.websiteUrl,
    timezone: congress.timezone || 'UTC',
    startDate: congress.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: congress.endDate?.toISOString().slice(0, 10) ?? null,
    location: congress.location,
    status: congress.status,
    createdAt: congress.createdAt.toISOString(),
  };
}

function toDisclosureItems(value: unknown): DisclosureItemPublic[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      title: String(item.title ?? '').trim(),
      url: item.url == null || item.url === '' ? null : String(item.url),
      description:
        item.description == null || item.description === ''
          ? null
          : String(item.description),
    }))
    .filter((item) => item.title.length > 0);
}

export function toCongressGuidePublic(guide: CongressGuide): CongressGuidePublic {
  return {
    id: guide.id,
    organizationId: guide.organizationId,
    congressId: guide.congressId,
    agendaMarkdown: guide.agendaMarkdown,
    floorPlanUrl: guide.floorPlanUrl,
    boothNotes: guide.boothNotes,
    boothScheduleMarkdown: guide.boothScheduleMarkdown,
    exhibitHallHoursMarkdown: guide.exhibitHallHoursMarkdown,
    staffDirectoryMarkdown: guide.staffDirectoryMarkdown,
    logisticsMarkdown: guide.logisticsMarkdown,
    contactsMarkdown: guide.contactsMarkdown,
    lodgingMarkdown: guide.lodgingMarkdown,
    safetyMarkdown: guide.safetyMarkdown,
    disclosuresMarkdown: guide.disclosuresMarkdown,
    disclosureItems: toDisclosureItems(guide.disclosureItems),
    icwDinnersMarkdown: guide.icwDinnersMarkdown,
    icwReceptionMarkdown: guide.icwReceptionMarkdown,
    icwAdBoardsMarkdown: guide.icwAdBoardsMarkdown,
    icwWorkRoomMarkdown: guide.icwWorkRoomMarkdown,
    icwMeetingRoomsMarkdown: guide.icwMeetingRoomsMarkdown,
    createdAt: guide.createdAt.toISOString(),
    updatedAt: guide.updatedAt.toISOString(),
  };
}

export function toKolPublic(kol: Kol): KolPublic {
  return {
    id: kol.id,
    organizationId: kol.organizationId,
    name: kol.name,
    email: kol.email,
    institution: kol.institution,
    therapeuticArea: kol.therapeuticArea,
    region: kol.region,
    notes: kol.notes,
    createdAt: kol.createdAt.toISOString(),
  };
}

export function toAppointmentAttendeePublic(
  attendee: AppointmentAttendeeWithRelations,
): AppointmentAttendeePublic {
  return {
    id: attendee.id,
    appointmentId: attendee.appointmentId,
    kind: attendee.kind,
    kolId: attendee.kolId,
    userId: attendee.userId,
    name: attendee.name,
    email: attendee.email,
    rsvpStatus: attendee.rsvpStatus,
    isPrimary: attendee.isPrimary,
    createdAt: attendee.createdAt.toISOString(),
  };
}

export function toAppointmentPublic(
  appointment: AppointmentWithRelations,
): AppointmentPublic {
  return {
    id: appointment.id,
    organizationId: appointment.organizationId,
    congressId: appointment.congressId,
    roomId: appointment.roomId,
    kolId: appointment.kolId,
    createdById: appointment.createdById,
    title: appointment.title,
    location: appointment.location,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    status: appointment.status,
    engagementType: appointment.engagementType,
    isContracted: appointment.isContracted,
    contractNotes: appointment.contractNotes,
    notes: appointment.notes,
    checkInCode: appointment.checkInCode,
    createdAt: appointment.createdAt.toISOString(),
    kol: appointment.kol ? toKolPublic(appointment.kol) : null,
    congress: appointment.congress
      ? toCongressPublic(appointment.congress)
      : null,
    room: appointment.room ? toRoomPublic(appointment.room) : null,
    attendees: appointment.attendees?.map(toAppointmentAttendeePublic),
  };
}

export function toCheckInPublic(checkIn: CheckInWithRelations): CheckInPublic {
  return {
    id: checkIn.id,
    organizationId: checkIn.organizationId,
    appointmentId: checkIn.appointmentId,
    checkedInById: checkIn.checkedInById,
    attendeeName: checkIn.attendeeName,
    attendeeEmail: checkIn.attendeeEmail,
    checkedInAt: checkIn.checkedInAt.toISOString(),
    notes: checkIn.notes,
    tovAmount: checkIn.tovAmount?.toString() ?? null,
    tovType: checkIn.tovType,
    tovCurrency: checkIn.tovCurrency,
    signatureStatus: checkIn.signatureStatus,
    signatureKey: checkIn.signatureKey,
    signatureSignedAt: checkIn.signatureSignedAt?.toISOString() ?? null,
    voidedAt: checkIn.voidedAt?.toISOString() ?? null,
    voidReason: checkIn.voidReason,
    replacesCheckInId: checkIn.replacesCheckInId,
    integrationStatus: checkIn.integrationStatus,
    integrationDestination: checkIn.integrationDestination,
    integrationExternalId: checkIn.integrationExternalId,
    integrationLastError: checkIn.integrationLastError,
    integrationIdempotencyKey: checkIn.integrationIdempotencyKey,
    integrationAttemptCount: checkIn.integrationAttemptCount,
    integrationPushedAt: checkIn.integrationPushedAt?.toISOString() ?? null,
    createdAt: checkIn.createdAt.toISOString(),
    appointment: checkIn.appointment
      ? toAppointmentPublic(checkIn.appointment)
      : null,
  };
}

export function toTemplatePublic(
  template: InvitationTemplate,
): InvitationTemplatePublic {
  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    createdAt: template.createdAt.toISOString(),
  };
}

export function toInvitationPublic(
  invitation: Invitation & { kol?: Kol | null },
): InvitationPublic {
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    campaignId: invitation.campaignId,
    kolId: invitation.kolId,
    appointmentId: invitation.appointmentId,
    toEmail: invitation.toEmail,
    toName: invitation.toName,
    subject: invitation.subject,
    status: invitation.status,
    engagementType: invitation.engagementType,
    isContracted: invitation.isContracted,
    errorMessage: invitation.errorMessage,
    sentAt: invitation.sentAt?.toISOString() ?? null,
    openedAt: invitation.openedAt?.toISOString() ?? null,
    respondedAt: invitation.respondedAt?.toISOString() ?? null,
    responseText: invitation.responseText,
    responseToken: invitation.responseToken,
    createdAt: invitation.createdAt.toISOString(),
    kol: invitation.kol ? toKolPublic(invitation.kol) : null,
  };
}

type CampaignWithRelations = OutreachCampaign & {
  template?: InvitationTemplate | null;
  congress?: Congress | null;
  invitations?: Array<Invitation & { kol?: Kol | null }>;
  _count?: { invitations: number };
};

export function toCampaignPublic(
  campaign: CampaignWithRelations,
): CampaignPublic {
  return {
    id: campaign.id,
    organizationId: campaign.organizationId,
    congressId: campaign.congressId,
    templateId: campaign.templateId,
    name: campaign.name,
    status: campaign.status,
    engagementType: campaign.engagementType,
    isContracted: campaign.isContracted,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    invitationCount:
      campaign._count?.invitations ?? campaign.invitations?.length,
    template: campaign.template ? toTemplatePublic(campaign.template) : null,
    congress: campaign.congress ? toCongressPublic(campaign.congress) : null,
    invitations: campaign.invitations?.map(toInvitationPublic),
  };
}

type MeetingRequestAttendeeWithRelations = MeetingRequestAttendee & {
  kol?: Kol | null;
};

type MeetingRequestWithRelations = MeetingRequest & {
  congress?: Congress | null;
  appointment?: AppointmentWithRelations | null;
  attendees?: MeetingRequestAttendeeWithRelations[];
};

export function toMeetingRequestAttendeePublic(
  attendee: MeetingRequestAttendeeWithRelations,
): MeetingRequestAttendeePublic {
  return {
    id: attendee.id,
    meetingRequestId: attendee.meetingRequestId,
    kind: attendee.kind,
    kolId: attendee.kolId,
    name: attendee.name,
    email: attendee.email,
    country: attendee.country,
    isPrimary: attendee.isPrimary,
    notes: attendee.notes,
    createdAt: attendee.createdAt.toISOString(),
    kol: attendee.kol ? toKolPublic(attendee.kol) : null,
  };
}

export function toMeetingRequestPublic(
  request: MeetingRequestWithRelations,
): MeetingRequestPublic {
  return {
    id: request.id,
    organizationId: request.organizationId,
    congressId: request.congressId,
    createdById: request.createdById,
    appointmentId: request.appointmentId,
    status: request.status,
    engagementType: request.engagementType,
    isContracted: request.isContracted,
    needsCda: request.needsCda,
    topic: request.topic,
    informalTopicPreset: request.informalTopicPreset,
    contractObjective: request.contractObjective,
    requestedDurationMinutes: request.requestedDurationMinutes,
    avNeeded: request.avNeeded,
    meetingOwnerName: request.meetingOwnerName,
    meetingOwnerEmail: request.meetingOwnerEmail,
    meetingOwnerPhone: request.meetingOwnerPhone,
    meetingOwnerFunctionalArea: request.meetingOwnerFunctionalArea,
    budgetApprover: request.budgetApprover,
    costCenter: request.costCenter,
    productTags: request.productTags || [],
    cdaScope: request.cdaScope,
    cdaStage: request.cdaStage,
    comments: request.comments,
    schedulingNotes: request.schedulingNotes,
    contractNotes: request.contractNotes,
    withdrawnReason: request.withdrawnReason,
    createdAt: request.createdAt.toISOString(),
    congress: request.congress ? toCongressPublic(request.congress) : null,
    appointment: request.appointment
      ? toAppointmentPublic(request.appointment)
      : null,
    attendees: request.attendees?.map(toMeetingRequestAttendeePublic),
  };
}
