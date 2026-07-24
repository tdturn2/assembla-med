export type IntegrationPushPayload = {
  organizationId: string;
  checkInId: string;
  idempotencyKey: string;
  congressName: string | null;
  appointmentId: string;
  appointmentTitle: string;
  checkInCode: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  kolName: string | null;
  kolEmail: string | null;
  checkedInAt: string;
  tovAmount: string | null;
  tovCurrency: string | null;
  tovType: string | null;
  signatureStatus: string;
  engagementType: string | null;
  isContracted: boolean;
  forceFail?: boolean;
};

export type IntegrationPushResult = {
  externalId: string;
  alreadyExisted: boolean;
};

export interface DestinationAdapter {
  readonly destination: 'mock' | 'cvent';
  pushCheckIn(payload: IntegrationPushPayload): Promise<IntegrationPushResult>;
}
