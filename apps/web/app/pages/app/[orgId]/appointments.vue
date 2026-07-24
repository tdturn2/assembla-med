<script setup lang="ts">
import type {
  AppointmentAttendeePublic,
  AppointmentPublic,
  CongressPublic,
  EngagementType,
  KolPublic
} from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const toast = useToast()

definePageMeta({
  layout: 'console',
  title: 'Appointments'
})

const { api } = useApi()

const { data: pageData, pending, refresh } = await useAsyncData(
  `appointments-page-${orgId}`,
  async () => {
    const [congresses, kols, appointments] = await Promise.all([
      api<{ congresses: CongressPublic[] }>(`/organizations/${orgId}/congresses`),
      api<{ kols: KolPublic[] }>(`/organizations/${orgId}/kols`),
      api<{ appointments: AppointmentPublic[] }>(`/organizations/${orgId}/appointments`)
    ])
    return {
      congresses: congresses.congresses,
      kols: kols.kols,
      appointments: appointments.appointments
    }
  }
)

const congressData = computed(() => ({ congresses: pageData.value?.congresses || [] }))
const kolData = computed(() => ({ kols: pageData.value?.kols || [] }))
const data = computed(() => ({ appointments: pageData.value?.appointments || [] }))

const engagementOptions: { label: string, value: EngagementType }[] = [
  { label: 'Meeting', value: 'meeting' },
  { label: 'Advisory board', value: 'advisory_board' },
  { label: 'Contracted talk', value: 'contracted_talk' },
  { label: 'Informal', value: 'informal' },
  { label: 'Other', value: 'other' }
]

const form = reactive({
  congressId: '',
  kolId: '',
  title: '',
  location: '',
  startTime: '',
  endTime: '',
  engagementType: 'meeting' as EngagementType,
  isContracted: false,
  contractNotes: '',
  extraKolIds: [] as string[],
  externalName: '',
  externalEmail: ''
})
const error = ref('')
const creating = ref(false)
const attendeeBusy = ref<string | null>(null)
const addForms = reactive<Record<string, { kolId: string, externalName: string }>>({})

watch(() => data.value.appointments, (list) => {
  for (const appt of list) {
    if (!addForms[appt.id]) {
      addForms[appt.id] = { kolId: '', externalName: '' }
    }
  }
}, { immediate: true })

watch(() => congressData.value.congresses, (list) => {
  if (!form.congressId && list[0]) {
    form.congressId = list[0].id
  }
}, { immediate: true })

watch(() => form.engagementType, (type) => {
  if (type === 'contracted_talk') {
    form.isContracted = true
  }
})

const congressItems = computed(() =>
  (congressData.value?.congresses || []).map(c => ({ label: c.name, value: c.id }))
)
const kolItems = computed(() => [
  { label: 'No primary KOL', value: '' },
  ...(kolData.value?.kols || []).map(k => ({ label: k.name, value: k.id }))
])
const extraKolOptions = computed(() =>
  (kolData.value?.kols || [])
    .filter(k => k.id !== form.kolId)
    .map(k => ({ label: k.name, value: k.id }))
)

function attendeeLabel(attendee: AppointmentAttendeePublic) {
  const bits = [attendee.name]
  if (attendee.isPrimary) bits.push('primary')
  if (attendee.kind !== 'kol') bits.push(attendee.kind)
  bits.push(attendee.rsvpStatus)
  return bits.join(' · ')
}

async function onCreate() {
  error.value = ''
  creating.value = true
  try {
    const attendees: Array<Record<string, unknown>> = []
    for (const kolId of form.extraKolIds) {
      attendees.push({ kind: 'kol', kolId, rsvpStatus: 'invited' })
    }
    if (form.externalName.trim()) {
      attendees.push({
        kind: 'external',
        name: form.externalName.trim(),
        email: form.externalEmail.trim() || undefined,
        rsvpStatus: 'invited'
      })
    }

    await api(`/organizations/${orgId}/appointments`, {
      method: 'POST',
      body: {
        congressId: form.congressId,
        kolId: form.kolId || undefined,
        title: form.title,
        location: form.location || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        engagementType: form.engagementType,
        isContracted: form.isContracted,
        contractNotes: form.contractNotes || undefined,
        attendees: attendees.length ? attendees : undefined
      }
    })
    form.title = ''
    form.location = ''
    form.startTime = ''
    form.endTime = ''
    form.kolId = ''
    form.extraKolIds = []
    form.externalName = ''
    form.externalEmail = ''
    form.contractNotes = ''
    form.isContracted = form.engagementType === 'contracted_talk'
    await refresh()
    toast.add({ title: 'Appointment created', color: 'success' })
  } catch (e: unknown) {
    const payload = e as { data?: { message?: string | string[] } }
    error.value = Array.isArray(payload.data?.message)
      ? payload.data.message.join(', ')
      : payload.data?.message || 'Unable to create appointment'
  } finally {
    creating.value = false
  }
}

async function addAttendee(appointmentId: string) {
  const draft = addForms[appointmentId]
  if (!draft) return
  attendeeBusy.value = appointmentId
  error.value = ''
  try {
    if (draft.kolId) {
      await api(`/organizations/${orgId}/appointments/${appointmentId}/attendees`, {
        method: 'POST',
        body: { kind: 'kol', kolId: draft.kolId, rsvpStatus: 'invited' }
      })
    } else if (draft.externalName.trim()) {
      await api(`/organizations/${orgId}/appointments/${appointmentId}/attendees`, {
        method: 'POST',
        body: {
          kind: 'external',
          name: draft.externalName.trim(),
          rsvpStatus: 'invited'
        }
      })
    } else {
      error.value = 'Choose a KOL or enter an external attendee name'
      return
    }
    draft.kolId = ''
    draft.externalName = ''
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Unable to add attendee'
  } finally {
    attendeeBusy.value = null
  }
}

async function removeAttendee(appointmentId: string, attendeeId: string) {
  attendeeBusy.value = attendeeId
  error.value = ''
  try {
    await api(`/organizations/${orgId}/appointments/${appointmentId}/attendees/${attendeeId}`, {
      method: 'DELETE'
    })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Unable to remove attendee'
  } finally {
    attendeeBusy.value = null
  }
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Appointments
      </h1>
      <p class="mt-1 text-sm text-muted">
        Schedule meetings, mark contracted engagements, and manage who is attending.
      </p>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <h2 class="font-medium text-highlighted">
        Book appointment
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
        <UFormField label="Primary KOL">
          <select
            v-model="form.kolId"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="item in kolItems"
              :key="item.value || 'none'"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField
          label="Title"
          class="sm:col-span-2"
        >
          <UInput
            v-model="form.title"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Start">
          <UInput
            v-model="form.startTime"
            type="datetime-local"
            class="w-full"
          />
        </UFormField>
        <UFormField label="End">
          <UInput
            v-model="form.endTime"
            type="datetime-local"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Engagement type">
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
        <UFormField label="Location">
          <UInput
            v-model="form.location"
            class="w-full"
          />
        </UFormField>
        <div class="sm:col-span-2 flex items-start gap-3">
          <label class="flex items-center gap-2 text-sm pt-2">
            <input
              v-model="form.isContracted"
              type="checkbox"
              class="rounded border-default"
            >
            <span>Contracted engagement</span>
          </label>
        </div>
        <UFormField
          v-if="form.isContracted"
          label="Contract notes"
          class="sm:col-span-2"
        >
          <UInput
            v-model="form.contractNotes"
            placeholder="SOW / fee / speaker agreement ref"
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
              Add more KOLs to invite additional attendees.
            </p>
          </div>
        </UFormField>
        <UFormField label="External attendee name">
          <UInput
            v-model="form.externalName"
            class="w-full"
          />
        </UFormField>
        <UFormField label="External attendee email">
          <UInput
            v-model="form.externalEmail"
            type="email"
            class="w-full"
          />
        </UFormField>
      </div>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="String(error)"
      />
      <UButton
        :loading="creating"
        :disabled="!form.congressId || form.title.trim().length < 2 || !form.startTime || !form.endTime"
        @click="onCreate"
      >
        Create appointment
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
        v-for="appt in data?.appointments || []"
        :key="appt.id"
        class="px-4 py-4 space-y-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-medium text-highlighted">
              {{ appt.title }}
            </p>
            <p class="text-xs text-muted">
              {{ appt.congress?.name || 'Congress' }}
              <span v-if="appt.kol"> · {{ appt.kol.name }}</span>
              · {{ appt.status }}
              · {{ appt.engagementType.replace('_', ' ') }}
              <span v-if="appt.isContracted"> · contracted</span>
            </p>
            <p class="text-xs text-muted mt-1">
              {{ new Date(appt.startTime).toLocaleString() }}
              –
              {{ new Date(appt.endTime).toLocaleString() }}
            </p>
            <p
              v-if="appt.contractNotes"
              class="text-xs text-muted mt-1"
            >
              Contract: {{ appt.contractNotes }}
            </p>
          </div>
          <UBadge
            color="neutral"
            variant="subtle"
          >
            Code {{ appt.checkInCode }}
          </UBadge>
        </div>

        <div class="rounded-md border border-default bg-elevated/40 p-3 space-y-2">
          <p class="text-xs font-medium text-highlighted uppercase tracking-wide">
            Attendees
          </p>
          <ul
            v-if="appt.attendees?.length"
            class="space-y-1"
          >
            <li
              v-for="attendee in appt.attendees"
              :key="attendee.id"
              class="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>{{ attendeeLabel(attendee) }}</span>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="attendeeBusy === attendee.id"
                @click="removeAttendee(appt.id, attendee.id)"
              >
                Remove
              </UButton>
            </li>
          </ul>
          <p
            v-else
            class="text-xs text-muted"
          >
            No attendees listed yet.
          </p>
          <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] pt-1">
            <select
              v-if="addForms[appt.id]"
              v-model="addForms[appt.id].kolId"
              class="w-full rounded-md border border-default bg-default px-2 py-1.5 text-sm"
            >
              <option value="">
                Add KOL…
              </option>
              <option
                v-for="kol in kolData.kols"
                :key="kol.id"
                :value="kol.id"
              >
                {{ kol.name }}
              </option>
            </select>
            <UInput
              v-if="addForms[appt.id]"
              v-model="addForms[appt.id].externalName"
              placeholder="Or external name"
              size="sm"
              class="w-full"
            />
            <UButton
              size="sm"
              :loading="attendeeBusy === appt.id"
              @click="addAttendee(appt.id)"
            >
              Add
            </UButton>
          </div>
        </div>
      </li>
      <li
        v-if="!(data?.appointments || []).length"
        class="px-4 py-6 text-sm text-muted"
      >
        No appointments yet.
      </li>
    </ul>
  </div>
</template>
