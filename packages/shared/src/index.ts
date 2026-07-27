/** Shared contracts between Console (Nuxt) and API (Nest). */

export type SubscriptionTier = 'core' | 'core_plus'

export type MembershipRole = 'org_admin' | 'rep' | 'viewer'

export type CongressStatus = 'planning' | 'active' | 'completed'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type EngagementType =
  | 'meeting'
  | 'advisory_board'
  | 'contracted_talk'
  | 'informal'
  | 'other'

export type AttendeeKind = 'kol' | 'staff' | 'external'

export type AttendeeRsvpStatus =
  | 'pending'
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'attending'

export type SignatureStatus = 'not_required' | 'pending' | 'signed'

export type IntegrationDestination = 'mock' | 'cvent'

export type IntegrationPushStatus =
  | 'pending'
  | 'pushed'
  | 'failed'
  | 'skipped'

export interface HealthResponse {
  status: 'ok'
  service: 'assembla-med-api'
  timestamp: string
  database?: 'up' | 'down'
}

export interface UserPublic {
  id: string
  email: string
  createdAt: string
}

export interface OrganizationPublic {
  id: string
  name: string
  subscriptionTier: SubscriptionTier
  createdAt: string
}

export interface MembershipPublic {
  id: string
  role: MembershipRole
  organizationId: string
  userId: string
  organization?: OrganizationPublic
  user?: UserPublic
  createdAt: string
}

export interface MeResponse {
  user: UserPublic
  memberships: MembershipPublic[]
}

export interface CongressPublic {
  id: string
  organizationId: string
  name: string
  cventId: string | null
  companyContactName: string | null
  companyContactEmail: string | null
  websiteUrl: string | null
  startDate: string | null
  endDate: string | null
  location: string | null
  status: CongressStatus
  createdAt: string
}

/** Linked disclosure row (Event App + Console authoring). */
export interface DisclosureItemPublic {
  title: string
  url?: string | null
  description?: string | null
}

export interface CongressGuidePublic {
  id: string
  organizationId: string
  congressId: string
  agendaMarkdown: string | null
  floorPlanUrl: string | null
  boothNotes: string | null
  boothScheduleMarkdown: string | null
  exhibitHallHoursMarkdown: string | null
  staffDirectoryMarkdown: string | null
  logisticsMarkdown: string | null
  contactsMarkdown: string | null
  lodgingMarkdown: string | null
  safetyMarkdown: string | null
  disclosuresMarkdown: string | null
  disclosureItems: DisclosureItemPublic[]
  icwDinnersMarkdown: string | null
  icwReceptionMarkdown: string | null
  icwAdBoardsMarkdown: string | null
  icwWorkRoomMarkdown: string | null
  icwMeetingRoomsMarkdown: string | null
  createdAt: string
  updatedAt: string
}

export interface RoomPublic {
  id: string
  organizationId: string
  congressId: string
  title: string
  sitting: number | null
  capacity: number | null
  hasAv: boolean
  avNotes: string | null
  layout: string | null
  supplyList: string | null
  notes: string | null
  createdAt: string
  /** Present on availability responses */
  available?: boolean
  conflictingAppointmentId?: string | null
}

export interface AvailabilitySlotPublic {
  available: boolean
  conflictingAppointmentId?: string | null
  conflictingTitle?: string | null
}

export interface KolPublic {
  id: string
  organizationId: string
  name: string
  email: string | null
  institution: string | null
  therapeuticArea: string | null
  region: string | null
  notes: string | null
  createdAt: string
}

export interface AppointmentAttendeePublic {
  id: string
  appointmentId: string
  kind: AttendeeKind
  kolId: string | null
  userId: string | null
  name: string
  email: string | null
  rsvpStatus: AttendeeRsvpStatus
  isPrimary: boolean
  createdAt: string
}

export interface AppointmentPublic {
  id: string
  organizationId: string
  congressId: string
  roomId: string | null
  kolId: string | null
  createdById: string | null
  title: string
  location: string | null
  startTime: string
  endTime: string
  status: AppointmentStatus
  engagementType: EngagementType
  isContracted: boolean
  contractNotes: string | null
  notes: string | null
  checkInCode: string
  createdAt: string
  kol?: KolPublic | null
  congress?: CongressPublic | null
  room?: RoomPublic | null
  attendees?: AppointmentAttendeePublic[]
}

export interface CheckInPublic {
  id: string
  organizationId: string
  appointmentId: string
  checkedInById: string | null
  attendeeName: string | null
  attendeeEmail: string | null
  checkedInAt: string
  notes: string | null
  tovAmount: string | null
  tovType: string | null
  tovCurrency: string | null
  signatureStatus: SignatureStatus
  signatureKey: string | null
  signatureSignedAt: string | null
  voidedAt: string | null
  voidReason: string | null
  replacesCheckInId: string | null
  integrationStatus: IntegrationPushStatus
  integrationDestination: IntegrationDestination
  integrationExternalId: string | null
  integrationLastError: string | null
  integrationIdempotencyKey: string | null
  integrationAttemptCount: number
  integrationPushedAt: string | null
  createdAt: string
  appointment?: AppointmentPublic | null
}

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'completed'

export type InvitationStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'opened'
  | 'responded'
  | 'declined'

export interface InvitationTemplatePublic {
  id: string
  organizationId: string
  name: string
  subject: string
  bodyHtml: string
  createdAt: string
}

export interface InvitationPublic {
  id: string
  organizationId: string
  campaignId: string
  kolId: string
  appointmentId: string | null
  toEmail: string
  toName: string
  subject: string
  status: InvitationStatus
  engagementType: EngagementType
  isContracted: boolean
  errorMessage: string | null
  sentAt: string | null
  openedAt: string | null
  respondedAt: string | null
  responseText: string | null
  responseToken?: string
  createdAt: string
  kol?: KolPublic | null
}

export interface CampaignPublic {
  id: string
  organizationId: string
  congressId: string | null
  templateId: string
  name: string
  status: CampaignStatus
  engagementType: EngagementType
  isContracted: boolean
  sentAt: string | null
  createdAt: string
  invitationCount?: number
  template?: InvitationTemplatePublic | null
  congress?: CongressPublic | null
  invitations?: InvitationPublic[]
}
