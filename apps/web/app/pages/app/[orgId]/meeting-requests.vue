<script setup lang="ts">
import type {
  AppointmentPublic,
  CongressPublic,
  EngagementType,
  InformalTopicPreset,
  KolPublic,
  MeetingRequestPublic,
  MeetingRequestStatus,
  RoomPublic
} from '@assembla-med/shared'
import {
  resolveTimeZone,
  utcToWallInput,
  wallTimeToUtcIso
} from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const toast = useToast()

definePageMeta({
  layout: 'console',
  title: 'Meeting requests'
})

const { api } = useApi()

const { data: pageData, pending, refresh } = await useAsyncData(
  `meeting-requests-${orgId}`,
  async () => {
    const [congresses, kols, meetingRequests] = await Promise.all([
      api<{ congresses: CongressPublic[] }>(`/organizations/${orgId}/congresses`),
      api<{ kols: KolPublic[] }>(`/organizations/${orgId}/kols`),
      api<{ meetingRequests: MeetingRequestPublic[] }>(
        `/organizations/${orgId}/meeting-requests`
      )
    ])
    return {
      congresses: congresses.congresses,
      kols: kols.kols,
      meetingRequests: meetingRequests.meetingRequests
    }
  }
)

const engagementOptions: { label: string, value: EngagementType }[] = [
  { label: 'Meeting', value: 'meeting' },
  { label: 'Informal', value: 'informal' },
  { label: 'Contracted talk', value: 'contracted_talk' },
  { label: 'Advisory board', value: 'advisory_board' },
  { label: 'Other', value: 'other' }
]

const informalPresets: { label: string, value: InformalTopicPreset }[] = [
  { label: 'Introductory discussion', value: 'introductory' },
  { label: 'Reconnect with the team', value: 'reconnect' },
  { label: 'Follow up on existing project', value: 'follow_up' },
  { label: 'Interest in working together', value: 'interest' },
  { label: 'Activity schedule review', value: 'activity_schedule' },
  { label: 'Other', value: 'other' }
]

const durationOptions = [30, 45, 60, 90, 120]

const form = reactive({
  congressId: '',
  engagementType: 'informal' as EngagementType,
  isContracted: false,
  needsCda: false,
  topic: '',
  informalTopicPreset: '' as '' | InformalTopicPreset,
  contractObjective: '',
  requestedDurationMinutes: 30,
  avNeeded: false,
  meetingOwnerName: '',
  meetingOwnerEmail: '',
  meetingOwnerPhone: '',
  meetingOwnerFunctionalArea: '',
  budgetApprover: '',
  costCenter: '',
  productTags: '',
  cdaScope: '',
  cdaStage: '',
  comments: '',
  schedulingNotes: '',
  primaryKolId: '',
  extraKolIds: [] as string[],
  externalName: '',
  externalEmail: '',
  externalCountry: ''
})

const error = ref('')
const creating = ref(false)
const schedulingId = ref<string | null>(null)
const scheduleBusy = ref(false)
const scheduleForm = reactive({
  startTime: '',
  endTime: '',
  roomId: '',
  title: ''
})
const statusBusy = ref<string | null>(null)

watch(() => pageData.value?.congresses, (list) => {
  if (!form.congressId && list?.[0]) {
    form.congressId = list[0].id
  }
}, { immediate: true })

watch(() => form.engagementType, (type) => {
  if (type === 'contracted_talk') {
    form.isContracted = true
  }
})

watch(() => form.isContracted, (v) => {
  if (v) form.needsCda = false
})

const { data: scheduleRooms, pending: roomsPending } = await useAsyncData(
  `mr-schedule-rooms-${orgId}`,
  async () => {
    const req = (pageData.value?.meetingRequests || []).find(r => r.id === schedulingId.value)
    if (!req || !scheduleForm.startTime || !scheduleForm.endTime) {
      return { rooms: [] as RoomPublic[] }
    }
    const tz = resolveTimeZone(req.congress?.timezone)
    try {
      return await api<{ rooms: RoomPublic[] }>(
        `/organizations/${orgId}/congresses/${req.congressId}/rooms/availability?startTime=${encodeURIComponent(wallTimeToUtcIso(scheduleForm.startTime, tz))}&endTime=${encodeURIComponent(wallTimeToUtcIso(scheduleForm.endTime, tz))}`
      )
    } catch {
      return await api<{ rooms: RoomPublic[] }>(
        `/organizations/${orgId}/congresses/${req.congressId}/rooms`
      )
    }
  },
  { watch: [schedulingId, () => scheduleForm.startTime, () => scheduleForm.endTime] }
)

const roomItems = computed(() => [
  { label: 'No room', value: '', disabled: false },
  ...(scheduleRooms.value?.rooms || []).map(r => ({
    label: r.available === false
      ? `${r.title} (busy)`
      : `${r.title}${r.hasAv ? ' · AV' : ''}`,
    value: r.id,
    disabled: r.available === false
  }))
])

const congressItems = computed(() =>
  (pageData.value?.congresses || []).map(c => ({ label: c.name, value: c.id }))
)
const kolItems = computed(() =>
  (pageData.value?.kols || []).map(k => ({ label: k.name, value: k.id }))
)
const extraKolOptions = computed(() =>
  (pageData.value?.kols || [])
    .filter(k => k.id !== form.primaryKolId)
    .map(k => ({ label: k.name, value: k.id }))
)

function formatError(e: unknown, fallback: string) {
  const payload = e as { data?: { message?: string | string[] } }
  return Array.isArray(payload.data?.message)
    ? payload.data.message.join(', ')
    : payload.data?.message || fallback
}

function primaryLabel(req: MeetingRequestPublic) {
  const primary = req.attendees?.find(a => a.isPrimary) || req.attendees?.[0]
  return primary?.name || 'No TL listed'
}

function statusTone(status: MeetingRequestStatus) {
  if (status === 'scheduled') return 'success'
  if (status === 'withdrawn') return 'neutral'
  if (status === 'scheduling') return 'warning'
  return 'info'
}

async function onCreate() {
  error.value = ''
  creating.value = true
  try {
    const attendees: Array<Record<string, unknown>> = []
    if (form.primaryKolId) {
      attendees.push({ kind: 'kol', kolId: form.primaryKolId, isPrimary: true })
    }
    for (const kolId of form.extraKolIds) {
      attendees.push({ kind: 'kol', kolId, isPrimary: false })
    }
    if (form.externalName.trim()) {
      attendees.push({
        kind: form.primaryKolId ? 'external' : 'kol',
        name: form.externalName.trim(),
        email: form.externalEmail.trim() || undefined,
        country: form.externalCountry.trim() || undefined,
        isPrimary: !form.primaryKolId
      })
    }
    if (!attendees.length) {
      error.value = 'Add at least one TL (KOL or name)'
      return
    }

    await api(`/organizations/${orgId}/meeting-requests`, {
      method: 'POST',
      body: {
        congressId: form.congressId,
        engagementType: form.engagementType,
        isContracted: form.isContracted,
        needsCda: form.needsCda,
        topic: form.topic || undefined,
        informalTopicPreset: form.informalTopicPreset || undefined,
        contractObjective: form.contractObjective || undefined,
        requestedDurationMinutes: form.requestedDurationMinutes,
        avNeeded: form.avNeeded,
        meetingOwnerName: form.meetingOwnerName || undefined,
        meetingOwnerEmail: form.meetingOwnerEmail || undefined,
        meetingOwnerPhone: form.meetingOwnerPhone || undefined,
        meetingOwnerFunctionalArea: form.meetingOwnerFunctionalArea || undefined,
        budgetApprover: form.budgetApprover || undefined,
        costCenter: form.costCenter || undefined,
        productTags: form.productTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        cdaScope: form.cdaScope || undefined,
        cdaStage: form.cdaStage || undefined,
        comments: form.comments || undefined,
        schedulingNotes: form.schedulingNotes || undefined,
        attendees
      }
    })

    form.topic = ''
    form.informalTopicPreset = ''
    form.contractObjective = ''
    form.comments = ''
    form.schedulingNotes = ''
    form.primaryKolId = ''
    form.extraKolIds = []
    form.externalName = ''
    form.externalEmail = ''
    form.externalCountry = ''
    form.productTags = ''
    form.cdaScope = ''
    form.cdaStage = ''
    form.avNeeded = false
    form.needsCda = false
    form.isContracted = form.engagementType === 'contracted_talk'
    await refresh()
    toast.add({ title: 'Meeting request submitted', color: 'success' })
  } catch (e: unknown) {
    error.value = formatError(e, 'Unable to create meeting request')
  } finally {
    creating.value = false
  }
}

function openSchedule(req: MeetingRequestPublic) {
  schedulingId.value = req.id
  scheduleForm.title = req.topic || ''
  scheduleForm.roomId = ''
  const tz = resolveTimeZone(req.congress?.timezone)
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start.getTime() + req.requestedDurationMinutes * 60_000)
  scheduleForm.startTime = utcToWallInput(start.toISOString(), tz)
  scheduleForm.endTime = utcToWallInput(end.toISOString(), tz)
  error.value = ''
}

function cancelSchedule() {
  schedulingId.value = null
}

async function saveSchedule() {
  if (!schedulingId.value) return
  const req = (pageData.value?.meetingRequests || []).find(r => r.id === schedulingId.value)
  if (!req) return
  scheduleBusy.value = true
  error.value = ''
  try {
    const tz = resolveTimeZone(req.congress?.timezone)
    const result = await api<{
      meetingRequest: MeetingRequestPublic
      appointment: AppointmentPublic
    }>(`/organizations/${orgId}/meeting-requests/${schedulingId.value}/schedule`, {
      method: 'POST',
      body: {
        startTime: wallTimeToUtcIso(scheduleForm.startTime, tz),
        endTime: wallTimeToUtcIso(scheduleForm.endTime, tz),
        roomId: scheduleForm.roomId || undefined,
        title: scheduleForm.title || undefined
      }
    })
    schedulingId.value = null
    await refresh()
    toast.add({
      title: 'Appointment created',
      description: `Code ${result.appointment.checkInCode}`,
      color: 'success'
    })
  } catch (e: unknown) {
    error.value = formatError(e, 'Unable to schedule request')
  } finally {
    scheduleBusy.value = false
  }
}

async function setStatus(requestId: string, status: MeetingRequestStatus) {
  statusBusy.value = requestId
  error.value = ''
  try {
    const body: Record<string, unknown> = { status }
    if (status === 'withdrawn') {
      const reason = window.prompt('Withdraw reason')
      if (!reason?.trim()) return
      body.withdrawnReason = reason.trim()
    }
    await api(`/organizations/${orgId}/meeting-requests/${requestId}`, {
      method: 'PATCH',
      body
    })
    await refresh()
    toast.add({ title: `Marked ${status}`, color: 'success' })
  } catch (e: unknown) {
    error.value = formatError(e, 'Unable to update status')
  } finally {
    statusBusy.value = null
  }
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Meeting requests
      </h1>
      <p class="mt-1 text-sm text-muted">
        Capture demand before a hard slot — no room or time required until you schedule.
      </p>
      <div class="mt-3 flex gap-2">
        <UButton
          size="xs"
          color="primary"
          variant="soft"
        >
          Requests
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :to="`/app/${orgId}/appointments`"
        >
          Appointments
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :to="`/app/${orgId}/engagements`"
        >
          Hub
        </UButton>
      </div>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <h2 class="font-medium text-highlighted">
        Submit request
      </h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Congress">
          <select
            v-model="form.congressId"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="item in congressItems"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Meeting type">
          <select
            v-model="form.engagementType"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="item in engagementOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Primary KOL">
          <select
            v-model="form.primaryKolId"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option value="">
              Or enter TL name below…
            </option>
            <option
              v-for="item in kolItems"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Duration">
          <select
            v-model.number="form.requestedDurationMinutes"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="mins in durationOptions"
              :key="mins"
              :value="mins"
            >
              {{ mins }} min
            </option>
          </select>
        </UFormField>
        <UFormField
          label="Topic"
          class="sm:col-span-2"
        >
          <UInput
            v-model="form.topic"
            class="w-full"
            placeholder="Meeting topic"
          />
        </UFormField>
        <UFormField
          v-if="form.engagementType === 'informal' && !form.isContracted"
          label="Informal topic preset"
        >
          <select
            v-model="form.informalTopicPreset"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option value="">
              Optional…
            </option>
            <option
              v-for="item in informalPresets"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Product / indication tags">
          <UInput
            v-model="form.productTags"
            class="w-full"
            placeholder="Comma-separated, e.g. Miri - UC, GI - Other"
          />
        </UFormField>
        <div class="sm:col-span-2 flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input
              v-model="form.isContracted"
              type="checkbox"
              class="rounded border-default"
            >
            Contracted / paid
          </label>
          <label class="flex items-center gap-2">
            <input
              v-model="form.needsCda"
              type="checkbox"
              class="rounded border-default"
              :disabled="form.isContracted"
            >
            Needs CDA
          </label>
          <label class="flex items-center gap-2">
            <input
              v-model="form.avNeeded"
              type="checkbox"
              class="rounded border-default"
            >
            Video / AV needed
          </label>
        </div>
        <UFormField
          v-if="form.isContracted"
          label="Contracted objective"
          class="sm:col-span-2"
        >
          <UInput
            v-model="form.contractObjective"
            class="w-full"
            placeholder="Appears in contract / SOW language"
          />
        </UFormField>
        <template v-if="form.needsCda">
          <UFormField label="CDA molecule / scope">
            <UInput
              v-model="form.cdaScope"
              class="w-full"
            />
          </UFormField>
          <UFormField label="CDA stage">
            <UInput
              v-model="form.cdaStage"
              class="w-full"
              placeholder="Clinical / already covered…"
            />
          </UFormField>
        </template>
        <UFormField label="Meeting owner">
          <UInput
            v-model="form.meetingOwnerName"
            class="w-full"
          />
        </UFormField>
        <UFormField label="MO email">
          <UInput
            v-model="form.meetingOwnerEmail"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UFormField label="MO phone">
          <UInput
            v-model="form.meetingOwnerPhone"
            class="w-full"
          />
        </UFormField>
        <UFormField label="MO functional area">
          <UInput
            v-model="form.meetingOwnerFunctionalArea"
            class="w-full"
            placeholder="Medical / Marketing…"
          />
        </UFormField>
        <UFormField label="Budget approver">
          <UInput
            v-model="form.budgetApprover"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Cost center">
          <UInput
            v-model="form.costCenter"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Additional KOL attendees"
          class="sm:col-span-2"
        >
          <div class="max-h-36 space-y-2 overflow-y-auto rounded-md border border-default p-3">
            <label
              v-for="kol in extraKolOptions"
              :key="kol.value"
              class="flex items-center gap-2 text-sm"
            >
              <input
                v-model="form.extraKolIds"
                type="checkbox"
                class="rounded border-default"
                :value="kol.value"
              >
              <span>{{ kol.label }}</span>
            </label>
            <p
              v-if="!extraKolOptions.length"
              class="text-xs text-muted"
            >
              Add more KOLs to include additional TLs.
            </p>
          </div>
        </UFormField>
        <UFormField label="TL name (if not in KOL list)">
          <UInput
            v-model="form.externalName"
            class="w-full"
          />
        </UFormField>
        <UFormField label="TL email">
          <UInput
            v-model="form.externalEmail"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UFormField label="TL country">
          <UInput
            v-model="form.externalCountry"
            class="w-full"
            placeholder="DE / US MA…"
          />
        </UFormField>
        <UFormField
          label="Comments / constraints"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="form.comments"
            class="w-full"
            :rows="2"
          />
        </UFormField>
        <UFormField
          label="Scheduling notes"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="form.schedulingNotes"
            class="w-full"
            :rows="2"
            placeholder="Preferred windows, do-not-contact, affiliate notes…"
          />
        </UFormField>
      </div>
      <UAlert
        v-if="error && !schedulingId"
        color="error"
        variant="subtle"
        :title="String(error)"
      />
      <UButton
        :loading="creating"
        :disabled="!form.congressId"
        @click="onCreate"
      >
        Submit request
      </UButton>
    </div>

    <div
      v-if="pending"
      class="text-sm text-muted"
    >
      Loading…
    </div>
    <ul
      v-else
      class="divide-y divide-default rounded-lg border border-default bg-default"
    >
      <li
        v-for="req in pageData?.meetingRequests || []"
        :key="req.id"
        class="px-4 py-4 space-y-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-medium text-highlighted">
              {{ req.topic || primaryLabel(req) }}
            </p>
            <p class="text-xs text-muted">
              {{ req.congress?.name || 'Congress' }}
              · {{ primaryLabel(req) }}
              · {{ req.requestedDurationMinutes }} min
              · {{ req.engagementType.replace('_', ' ') }}
              <span v-if="req.isContracted"> · contracted</span>
              <span v-if="req.needsCda"> · CDA</span>
              <span v-if="req.avNeeded"> · AV</span>
            </p>
            <p
              v-if="req.meetingOwnerName"
              class="text-xs text-muted mt-1"
            >
              MO: {{ req.meetingOwnerName }}
              <span v-if="req.costCenter"> · CC {{ req.costCenter }}</span>
            </p>
            <p
              v-if="req.productTags?.length"
              class="text-xs text-muted mt-1"
            >
              {{ req.productTags.join(', ') }}
            </p>
          </div>
          <UBadge
            :color="statusTone(req.status)"
            variant="subtle"
          >
            {{ req.status }}
          </UBadge>
        </div>

        <div
          v-if="schedulingId === req.id"
          class="rounded-md border border-default bg-elevated/40 p-3 space-y-3"
        >
          <p class="text-xs font-medium text-highlighted uppercase tracking-wide">
            Schedule appointment
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField
              label="Title"
              class="sm:col-span-2"
            >
              <UInput
                v-model="scheduleForm.title"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="`Start (${schedulingId ? resolveTimeZone((pageData?.meetingRequests || []).find(r => r.id === schedulingId)?.congress?.timezone) : 'UTC'})`">
              <UInput
                v-model="scheduleForm.startTime"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="`End (${schedulingId ? resolveTimeZone((pageData?.meetingRequests || []).find(r => r.id === schedulingId)?.congress?.timezone) : 'UTC'})`">
              <UInput
                v-model="scheduleForm.endTime"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Room"
              class="sm:col-span-2"
            >
              <select
                v-model="scheduleForm.roomId"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
              >
                <option
                  v-for="item in roomItems"
                  :key="item.value || 'none'"
                  :value="item.value"
                  :disabled="item.disabled"
                >
                  {{ item.label }}
                </option>
              </select>
              <p
                v-if="roomsPending"
                class="mt-1 text-xs text-muted"
              >
                Checking rooms…
              </p>
            </UFormField>
          </div>
          <UAlert
            v-if="error && schedulingId === req.id"
            color="error"
            variant="subtle"
            :title="String(error)"
          />
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              :loading="scheduleBusy"
              :disabled="!scheduleForm.startTime || !scheduleForm.endTime"
              @click="saveSchedule"
            >
              Create appointment
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              :disabled="scheduleBusy"
              @click="cancelSchedule"
            >
              Cancel
            </UButton>
          </div>
        </div>

        <div
          v-else
          class="flex flex-wrap gap-2"
        >
          <UButton
            v-if="req.status !== 'scheduled' && req.status !== 'withdrawn'"
            size="xs"
            @click="openSchedule(req)"
          >
            Schedule
          </UButton>
          <UButton
            v-if="req.status === 'submitted'"
            size="xs"
            color="neutral"
            variant="soft"
            :loading="statusBusy === req.id"
            @click="setStatus(req.id, 'scheduling')"
          >
            Mark scheduling
          </UButton>
          <UButton
            v-if="req.status !== 'scheduled' && req.status !== 'withdrawn'"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="statusBusy === req.id"
            @click="setStatus(req.id, 'withdrawn')"
          >
            Withdraw
          </UButton>
          <UButton
            v-if="req.appointmentId"
            size="xs"
            color="neutral"
            variant="ghost"
            :to="`/app/${orgId}/appointments`"
          >
            View appointments
          </UButton>
        </div>
      </li>
      <li
        v-if="!(pageData?.meetingRequests || []).length"
        class="px-4 py-6 text-sm text-muted"
      >
        No meeting requests yet.
      </li>
    </ul>
  </div>
</template>
