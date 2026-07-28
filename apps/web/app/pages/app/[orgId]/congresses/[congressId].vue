<script setup lang="ts">
import type {
  AppointmentPublic,
  AppointmentStatus,
  CongressGuidePublic,
  CongressPublic,
  DisclosureItemPublic,
  RoomPublic
} from '@assembla-med/shared'
import { COMMON_TIMEZONES } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string
const config = useRuntimeConfig()
const toast = useToast()

definePageMeta({
  layout: 'console',
  title: 'Congress'
})

const { api } = useApi()

const { data: congressData, refresh: refreshCongress } = await useAsyncData(
  `congress-${congressId}`,
  () => api<{ congress: CongressPublic }>(`/organizations/${orgId}/congresses/${congressId}`)
)
const { data: summary, refresh: refreshSummary } = await useAsyncData(
  `congress-summary-${congressId}`,
  () => api<{
    appointments: number
    checkIns: number
    activeCheckIns: number
    completed: number
    noShow: number
    cancelled: number
    attendanceRate: number | null
  }>(`/organizations/${orgId}/congresses/${congressId}/summary`)
)
const { data: appointments, refresh: refreshAppointments } = await useAsyncData(
  `congress-appts-${congressId}`,
  () => api<{ appointments: AppointmentPublic[] }>(
    `/organizations/${orgId}/appointments?congressId=${congressId}`
  )
)
const { data: guideData, refresh: refreshGuide } = await useAsyncData(
  `congress-guide-${congressId}`,
  () => api<{ guide: CongressGuidePublic }>(
    `/organizations/${orgId}/congresses/${congressId}/guide`
  )
)
const { data: roomsData, refresh: refreshRooms } = await useAsyncData(
  `congress-rooms-${congressId}`,
  () => api<{ rooms: RoomPublic[] }>(
    `/organizations/${orgId}/congresses/${congressId}/rooms`
  )
)

const congressName = computed(() => congressData.value?.congress.name || 'Congress')

useHead({
  title: () => congressName.value
})

watch(congressName, (name) => {
  route.meta.title = name
}, { immediate: true })

const congressForm = reactive({
  name: '',
  cventId: '',
  companyContactName: '',
  companyContactEmail: '',
  websiteUrl: '',
  location: '',
  timezone: 'UTC',
  startDate: '',
  endDate: '',
  status: 'planning' as CongressPublic['status']
})

watch(() => congressData.value?.congress, (congress) => {
  if (!congress) return
  congressForm.name = congress.name
  congressForm.cventId = congress.cventId || ''
  congressForm.companyContactName = congress.companyContactName || ''
  congressForm.companyContactEmail = congress.companyContactEmail || ''
  congressForm.websiteUrl = congress.websiteUrl || ''
  congressForm.location = congress.location || ''
  congressForm.timezone = congress.timezone || 'UTC'
  congressForm.startDate = congress.startDate || ''
  congressForm.endDate = congress.endDate || ''
  congressForm.status = congress.status
}, { immediate: true })

const guideForm = reactive({
  agendaMarkdown: '',
  floorPlanUrl: '',
  boothNotes: '',
  boothScheduleMarkdown: '',
  exhibitHallHoursMarkdown: '',
  staffDirectoryMarkdown: '',
  logisticsMarkdown: '',
  contactsMarkdown: '',
  lodgingMarkdown: '',
  safetyMarkdown: '',
  disclosuresMarkdown: '',
  disclosureItems: [] as DisclosureItemPublic[],
  icwDinnersMarkdown: '',
  icwReceptionMarkdown: '',
  icwAdBoardsMarkdown: '',
  icwWorkRoomMarkdown: '',
  icwMeetingRoomsMarkdown: ''
})

watch(() => guideData.value?.guide, (guide) => {
  if (!guide) return
  guideForm.agendaMarkdown = guide.agendaMarkdown || ''
  guideForm.floorPlanUrl = guide.floorPlanUrl || ''
  guideForm.boothNotes = guide.boothNotes || ''
  guideForm.boothScheduleMarkdown = guide.boothScheduleMarkdown || ''
  guideForm.exhibitHallHoursMarkdown = guide.exhibitHallHoursMarkdown || ''
  guideForm.staffDirectoryMarkdown = guide.staffDirectoryMarkdown || ''
  guideForm.logisticsMarkdown = guide.logisticsMarkdown || ''
  guideForm.contactsMarkdown = guide.contactsMarkdown || ''
  guideForm.lodgingMarkdown = guide.lodgingMarkdown || ''
  guideForm.safetyMarkdown = guide.safetyMarkdown || ''
  guideForm.disclosuresMarkdown = guide.disclosuresMarkdown || ''
  guideForm.disclosureItems = (guide.disclosureItems || []).map(item => ({
    title: item.title,
    url: item.url || '',
    description: item.description || ''
  }))
  guideForm.icwDinnersMarkdown = guide.icwDinnersMarkdown || ''
  guideForm.icwReceptionMarkdown = guide.icwReceptionMarkdown || ''
  guideForm.icwAdBoardsMarkdown = guide.icwAdBoardsMarkdown || ''
  guideForm.icwWorkRoomMarkdown = guide.icwWorkRoomMarkdown || ''
  guideForm.icwMeetingRoomsMarkdown = guide.icwMeetingRoomsMarkdown || ''
}, { immediate: true })

const savingCongress = ref(false)
const savingGuide = ref(false)
const savingRoom = ref(false)
const congressError = ref('')
const guideError = ref('')
const roomError = ref('')

const roomForm = reactive({
  title: '',
  sitting: '' as string | number,
  capacity: '' as string | number,
  hasAv: false,
  avNotes: '',
  layout: '',
  supplyList: '',
  notes: ''
})

async function createRoom() {
  roomError.value = ''
  savingRoom.value = true
  try {
    await api(`/organizations/${orgId}/congresses/${congressId}/rooms`, {
      method: 'POST',
      body: {
        title: roomForm.title,
        sitting: roomForm.sitting === '' ? undefined : Number(roomForm.sitting),
        capacity: roomForm.capacity === '' ? undefined : Number(roomForm.capacity),
        hasAv: roomForm.hasAv,
        avNotes: roomForm.avNotes || undefined,
        layout: roomForm.layout || undefined,
        supplyList: roomForm.supplyList || undefined,
        notes: roomForm.notes || undefined
      }
    })
    roomForm.title = ''
    roomForm.sitting = ''
    roomForm.capacity = ''
    roomForm.hasAv = false
    roomForm.avNotes = ''
    roomForm.layout = ''
    roomForm.supplyList = ''
    roomForm.notes = ''
    await refreshRooms()
    toast.add({ title: 'Room added', color: 'success' })
  } catch (e: unknown) {
    roomError.value = formatError(e, 'Unable to create room')
  } finally {
    savingRoom.value = false
  }
}

async function deleteRoom(roomId: string) {
  roomError.value = ''
  try {
    await api(`/organizations/${orgId}/rooms/${roomId}`, { method: 'DELETE' })
    await refreshRooms()
    toast.add({ title: 'Room removed', color: 'success' })
  } catch (e: unknown) {
    roomError.value = formatError(e, 'Unable to delete room')
  }
}

const statusBusy = ref<string | null>(null)

async function setAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  statusBusy.value = appointmentId
  try {
    await api(`/organizations/${orgId}/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: { status }
    })
    await Promise.all([refreshAppointments(), refreshSummary()])
    toast.add({ title: `Marked ${status.replace('_', ' ')}`, color: 'success' })
  } catch (e: unknown) {
    toast.add({
      title: formatError(e, 'Unable to update appointment'),
      color: 'error'
    })
  } finally {
    statusBusy.value = null
  }
}

function printBadges() {
  const rows = (appointments.value?.appointments || [])
    .filter(a => a.status !== 'cancelled')
    .flatMap((appt) => {
      const people = (appt.attendees || []).length
        ? appt.attendees!
        : [{ name: appt.kol?.name || appt.title, isPrimary: true }]
      return people.map(person => ({
        name: person.name,
        role: 'isPrimary' in person && person.isPrimary ? 'Primary' : 'Attendee',
        meeting: appt.title,
        room: appt.room?.title || appt.location || '',
        code: appt.checkInCode
      }))
    })

  const html = `<!DOCTYPE html><html><head><title>Badges — ${congressName.value}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; }
  h1 { font-size: 16px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .badge { border: 1px solid #222; border-radius: 8px; padding: 16px; min-height: 120px; page-break-inside: avoid; }
  .name { font-size: 20px; font-weight: 700; }
  .meta { font-size: 12px; color: #444; margin-top: 6px; }
  @media print { body { margin: 0; } .badge { break-inside: avoid; } }
</style></head><body>
<h1>${congressName.value} — name badges (${rows.length})</h1>
<div class="grid">
${rows.map(r => `<div class="badge"><div class="name">${escapeHtml(r.name)}</div>
<div class="meta">${escapeHtml(r.role)} · ${escapeHtml(r.meeting)}</div>
<div class="meta">${escapeHtml(r.room)}${r.room ? ' · ' : ''}Code ${escapeHtml(r.code)}</div></div>`).join('')}
</div>
<script>window.onload=()=>window.print()<\/script>
</body></html>`

  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!w) {
    toast.add({ title: 'Allow pop-ups to print badges', color: 'warning' })
    return
  }
  w.document.write(html)
  w.document.close()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function addDisclosureItem() {
  guideForm.disclosureItems.push({ title: '', url: '', description: '' })
}

function removeDisclosureItem(index: number) {
  guideForm.disclosureItems.splice(index, 1)
}

async function saveCongress() {
  congressError.value = ''
  savingCongress.value = true
  try {
    await api(`/organizations/${orgId}/congresses/${congressId}`, {
      method: 'PATCH',
      body: {
        name: congressForm.name,
        cventId: congressForm.cventId || null,
        companyContactName: congressForm.companyContactName || null,
        companyContactEmail: congressForm.companyContactEmail || null,
        websiteUrl: congressForm.websiteUrl || null,
        location: congressForm.location || null,
        timezone: congressForm.timezone,
        startDate: congressForm.startDate || null,
        endDate: congressForm.endDate || null,
        status: congressForm.status
      }
    })
    await refreshCongress()
    toast.add({ title: 'Congress updated', color: 'success' })
  } catch (e: unknown) {
    congressError.value = formatError(e, 'Unable to save congress')
  } finally {
    savingCongress.value = false
  }
}

async function saveGuide() {
  guideError.value = ''
  savingGuide.value = true
  try {
    await api(`/organizations/${orgId}/congresses/${congressId}/guide`, {
      method: 'PATCH',
      body: {
        agendaMarkdown: guideForm.agendaMarkdown || null,
        floorPlanUrl: guideForm.floorPlanUrl || null,
        boothNotes: guideForm.boothNotes || null,
        boothScheduleMarkdown: guideForm.boothScheduleMarkdown || null,
        exhibitHallHoursMarkdown: guideForm.exhibitHallHoursMarkdown || null,
        staffDirectoryMarkdown: guideForm.staffDirectoryMarkdown || null,
        logisticsMarkdown: guideForm.logisticsMarkdown || null,
        contactsMarkdown: guideForm.contactsMarkdown || null,
        lodgingMarkdown: guideForm.lodgingMarkdown || null,
        safetyMarkdown: guideForm.safetyMarkdown || null,
        disclosuresMarkdown: guideForm.disclosuresMarkdown || null,
        disclosureItems: guideForm.disclosureItems
          .filter(item => item.title.trim())
          .map(item => ({
            title: item.title.trim(),
            url: item.url?.trim() || null,
            description: item.description?.trim() || null
          })),
        icwDinnersMarkdown: guideForm.icwDinnersMarkdown || null,
        icwReceptionMarkdown: guideForm.icwReceptionMarkdown || null,
        icwAdBoardsMarkdown: guideForm.icwAdBoardsMarkdown || null,
        icwWorkRoomMarkdown: guideForm.icwWorkRoomMarkdown || null,
        icwMeetingRoomsMarkdown: guideForm.icwMeetingRoomsMarkdown || null
      }
    })
    await refreshGuide()
    toast.add({ title: 'Event guide saved', color: 'success' })
  } catch (e: unknown) {
    guideError.value = formatError(e, 'Unable to save guide')
  } finally {
    savingGuide.value = false
  }
}

function formatError(e: unknown, fallback: string) {
  const message = (e as { data?: { message?: string | string[] } })?.data?.message
  if (!message) return fallback
  return Array.isArray(message) ? message.join(', ') : String(message)
}

const exportUrl = computed(
  () => `${config.public.apiBase}/organizations/${orgId}/congresses/${congressId}/export/check-ins`
)

async function downloadExport() {
  const csv = await api<string>(
    `/organizations/${orgId}/congresses/${congressId}/export/check-ins`,
    { responseType: 'text' }
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${congressName.value}-check-ins.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadCventExport() {
  const csv = await api<string>(
    `/organizations/${orgId}/congresses/${congressId}/export/check-ins-cvent`,
    { responseType: 'text' }
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${congressName.value}-cvent-import.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({
    title: 'CVENT-oriented CSV downloaded',
    description: 'Provisional headers — buyer self-imports; we never need their login.',
    color: 'success'
  })
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <NuxtLink
          :to="`/app/${orgId}`"
          class="text-sm text-muted hover:text-highlighted"
        >
          ← Congresses
        </NuxtLink>
        <h1 class="mt-2 text-2xl font-semibold text-highlighted tracking-tight">
          {{ congressName }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ congressData?.congress.location || 'No location' }}
          · {{ congressData?.congress.status }}
          <span v-if="congressData?.congress.cventId">
            · CVENT {{ congressData.congress.cventId }}
          </span>
        </p>
        <p
          v-if="congressData?.congress.companyContactName"
          class="mt-1 text-sm text-muted"
        >
          Contact: {{ congressData.congress.companyContactName }}
          <span v-if="congressData.congress.companyContactEmail">
            · {{ congressData.congress.companyContactEmail }}
          </span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-qr-code"
          :to="`/app/${orgId}/check-in`"
        >
          Check-in
        </UButton>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-smartphone"
          :to="`/event/${orgId}/c/${congressId}`"
        >
          Open Event App
        </UButton>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-download"
          @click="downloadExport"
        >
          Export check-ins CSV
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-file-spreadsheet"
          @click="downloadCventExport"
        >
          CVENT-oriented CSV
        </UButton>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs uppercase tracking-wide text-muted">
          Appointments
        </p>
        <p class="mt-1 text-2xl font-semibold text-highlighted">
          {{ summary?.appointments ?? '—' }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs uppercase tracking-wide text-muted">
          Active check-ins
        </p>
        <p class="mt-1 text-2xl font-semibold text-highlighted">
          {{ summary?.activeCheckIns ?? '—' }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs uppercase tracking-wide text-muted">
          Attendance rate
        </p>
        <p class="mt-1 text-2xl font-semibold text-highlighted">
          {{ summary?.attendanceRate != null ? `${summary.attendanceRate}%` : '—' }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs uppercase tracking-wide text-muted">
          Occurred / no-show
        </p>
        <p class="mt-1 text-2xl font-semibold text-highlighted">
          {{ summary?.completed ?? 0 }} / {{ summary?.noShow ?? 0 }}
        </p>
      </div>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="font-medium text-highlighted">
            Management
          </h2>
          <p class="text-xs text-muted mt-1">
            Badges, attendance outcomes, and CVENT status export.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            icon="i-lucide-id-card"
            @click="printBadges"
          >
            Print name badges
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            icon="i-lucide-file-spreadsheet"
            @click="downloadCventExport"
          >
            Update CVENT (CSV)
          </UButton>
        </div>
      </div>
      <ul class="divide-y divide-default rounded-md border border-default">
        <li
          v-for="appt in appointments?.appointments || []"
          :key="appt.id"
          class="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm"
        >
          <div class="min-w-0">
            <p class="font-medium text-highlighted">
              {{ appt.title }}
            </p>
            <p class="text-xs text-muted">
              {{ appt.kol?.name || 'No KOL' }}
              · {{ appt.status.replace('_', ' ') }}
              · Code {{ appt.checkInCode }}
              <span v-if="appt.room"> · {{ appt.room.title }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-1">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              :loading="statusBusy === appt.id"
              :disabled="appt.status === 'completed'"
              @click="setAppointmentStatus(appt.id, 'completed')"
            >
              Occurred
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              :loading="statusBusy === appt.id"
              :disabled="appt.status === 'no_show'"
              @click="setAppointmentStatus(appt.id, 'no_show')"
            >
              No show
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :loading="statusBusy === appt.id"
              :disabled="appt.status === 'cancelled'"
              @click="setAppointmentStatus(appt.id, 'cancelled')"
            >
              Cancel
            </UButton>
          </div>
        </li>
        <li
          v-if="!(appointments?.appointments || []).length"
          class="px-3 py-4 text-sm text-muted"
        >
          No appointments to manage yet.
        </li>
      </ul>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <div>
        <h2 class="font-medium text-highlighted">
          Congress details
        </h2>
        <p class="text-xs text-muted mt-1">
          Name, CVENT ID, and company contact shown on tiles and the Event App.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Congress name">
          <UInput
            v-model="congressForm.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="CVENT ID">
          <UInput
            v-model="congressForm.cventId"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Company contact">
          <UInput
            v-model="congressForm.companyContactName"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Contact email">
          <UInput
            v-model="congressForm.companyContactEmail"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Congress website">
          <UInput
            v-model="congressForm.websiteUrl"
            class="w-full"
            placeholder="https://"
          />
        </UFormField>
        <UFormField label="Location">
          <UInput
            v-model="congressForm.location"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Venue timezone">
          <select
            v-model="congressForm.timezone"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="tz in COMMON_TIMEZONES"
              :key="tz.value"
              :value="tz.value"
            >
              {{ tz.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Start date">
          <UInput
            v-model="congressForm.startDate"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField label="End date">
          <UInput
            v-model="congressForm.endDate"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Status">
          <USelect
            v-model="congressForm.status"
            :items="[
              { label: 'Planning', value: 'planning' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' }
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
      <UAlert
        v-if="congressError"
        color="error"
        variant="subtle"
        :title="String(congressError)"
      />
      <UButton
        :loading="savingCongress"
        :disabled="congressForm.name.trim().length < 2"
        @click="saveCongress"
      >
        Save congress details
      </UButton>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <div>
        <h2 class="font-medium text-highlighted">
          Event guide
        </h2>
        <p class="text-xs text-muted mt-1">
          Booth, ICW, and disclosures for the Event App.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField
          label="Agenda / congress schedule"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.agendaMarkdown"
            :rows="4"
            class="w-full"
            placeholder="Day 1 keynotes, sessions…"
          />
        </UFormField>
        <UFormField label="Floor plan URL">
          <UInput
            v-model="guideForm.floorPlanUrl"
            class="w-full"
            placeholder="https://"
          />
        </UFormField>
        <UFormField label="Booth notes">
          <UInput
            v-model="guideForm.boothNotes"
            class="w-full"
            placeholder="Hall B · Booth 214"
          />
        </UFormField>
        <UFormField
          label="Booth schedule"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.boothScheduleMarkdown"
            :rows="3"
            class="w-full"
            placeholder="Mon 9–5 demo slots…"
          />
        </UFormField>
        <UFormField
          label="Exhibit hall hours"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.exhibitHallHoursMarkdown"
            :rows="2"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Staff directory"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.staffDirectoryMarkdown"
            :rows="3"
            class="w-full"
            placeholder="Name · role · mobile"
          />
        </UFormField>
        <UFormField
          label="Logistics"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.logisticsMarkdown"
            :rows="3"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Contacts"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.contactsMarkdown"
            :rows="3"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Lodging"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.lodgingMarkdown"
            :rows="3"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Safety & security"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.safetyMarkdown"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="border-t border-default pt-3 space-y-3">
        <h3 class="text-sm font-medium text-highlighted">
          ICW
        </h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField
            label="Dinners (time, location, map)"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="guideForm.icwDinnersMarkdown"
              :rows="2"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Reception"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="guideForm.icwReceptionMarkdown"
              :rows="2"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Ad boards"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="guideForm.icwAdBoardsMarkdown"
              :rows="2"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Work room"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="guideForm.icwWorkRoomMarkdown"
              :rows="2"
              class="w-full"
              placeholder="Time, location, amenities"
            />
          </UFormField>
          <UFormField
            label="Meeting rooms"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="guideForm.icwMeetingRoomsMarkdown"
              :rows="2"
              class="w-full"
              placeholder="Time, location, meeting owner"
            />
          </UFormField>
        </div>
      </div>

      <div class="border-t border-default pt-3 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-medium text-highlighted">
              Disclosures
            </h3>
            <p class="text-xs text-muted">
              Linked items (Lilly-style) plus optional freeform notes.
            </p>
          </div>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            @click="addDisclosureItem"
          >
            Add link
          </UButton>
        </div>
        <div
          v-for="(item, index) in guideForm.disclosureItems"
          :key="index"
          class="grid gap-2 rounded-md border border-default p-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <UFormField label="Title">
            <UInput
              v-model="item.title"
              class="w-full"
              placeholder="Symposium title"
            />
          </UFormField>
          <UFormField label="URL">
            <UInput
              v-model="item.url as string"
              class="w-full"
              placeholder="https://"
            />
          </UFormField>
          <div class="flex items-end">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="removeDisclosureItem(index)"
            />
          </div>
          <UFormField
            label="Description"
            class="sm:col-span-3"
          >
            <UInput
              v-model="item.description as string"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField label="Disclosures notes (markdown)">
          <UTextarea
            v-model="guideForm.disclosuresMarkdown"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>

      <UAlert
        v-if="guideError"
        color="error"
        variant="subtle"
        :title="String(guideError)"
      />
      <UButton
        :loading="savingGuide"
        @click="saveGuide"
      >
        Save event guide
      </UButton>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <div>
        <h2 class="font-medium text-highlighted">
          Rooms
        </h2>
        <p class="text-xs text-muted mt-1">
          Inventory for this congress — sitting, AV, layout, supplies. Book from Appointments.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Room title">
          <UInput
            v-model="roomForm.title"
            class="w-full"
            placeholder="Meeting Room A"
          />
        </UFormField>
        <UFormField label="Sitting">
          <UInput
            v-model="roomForm.sitting"
            type="number"
            min="0"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Capacity">
          <UInput
            v-model="roomForm.capacity"
            type="number"
            min="0"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Layout">
          <UInput
            v-model="roomForm.layout"
            class="w-full"
            placeholder="U-shape / classroom"
          />
        </UFormField>
        <label class="flex items-center gap-2 text-sm sm:col-span-2 pt-1">
          <input
            v-model="roomForm.hasAv"
            type="checkbox"
            class="rounded border-default"
          >
          <span>AV available</span>
        </label>
        <UFormField
          label="AV notes"
          class="sm:col-span-2"
        >
          <UInput
            v-model="roomForm.avNotes"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Supply list"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="roomForm.supplyList"
            :rows="2"
            class="w-full"
            placeholder="Name tents, flip charts…"
          />
        </UFormField>
      </div>
      <UAlert
        v-if="roomError"
        color="error"
        variant="subtle"
        :title="String(roomError)"
      />
      <UButton
        :loading="savingRoom"
        :disabled="!roomForm.title.trim()"
        @click="createRoom"
      >
        Add room
      </UButton>
      <ul class="divide-y divide-default rounded-md border border-default">
        <li
          v-for="room in roomsData?.rooms || []"
          :key="room.id"
          class="flex items-start justify-between gap-3 px-3 py-3 text-sm"
        >
          <div class="min-w-0">
            <p class="font-medium text-highlighted">
              {{ room.title }}
            </p>
            <p class="text-xs text-muted mt-0.5">
              <span v-if="room.sitting != null">Sitting {{ room.sitting }}</span>
              <span v-if="room.capacity != null"> · Cap {{ room.capacity }}</span>
              <span v-if="room.hasAv"> · AV</span>
              <span v-if="room.layout"> · {{ room.layout }}</span>
            </p>
            <p
              v-if="room.supplyList"
              class="text-xs text-muted mt-1 whitespace-pre-wrap"
            >
              Supplies: {{ room.supplyList }}
            </p>
          </div>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="deleteRoom(room.id)"
          />
        </li>
        <li
          v-if="!(roomsData?.rooms || []).length"
          class="px-3 py-4 text-sm text-muted"
        >
          No rooms yet.
        </li>
      </ul>
    </div>

    <div class="rounded-lg border border-default bg-default">
      <div class="border-b border-default px-4 py-3 font-medium text-highlighted">
        Appointments
      </div>
      <ul class="divide-y divide-default">
        <li
          v-for="appt in appointments?.appointments || []"
          :key="appt.id"
          class="px-4 py-3 text-sm"
        >
          <p class="font-medium text-highlighted">
            {{ appt.title }}
          </p>
          <p class="text-muted text-xs">
            {{ appt.kol?.name || 'No KOL' }} · Code {{ appt.checkInCode }}
            <span v-if="appt.isContracted"> · contracted</span>
          </p>
        </li>
        <li
          v-if="!(appointments?.appointments || []).length"
          class="px-4 py-6 text-sm text-muted"
        >
          No appointments for this congress.
        </li>
      </ul>
    </div>

    <p class="text-xs text-muted break-all">
      Export endpoint: {{ exportUrl }}
    </p>
  </div>
</template>
