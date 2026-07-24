<script setup lang="ts">
import type {
  AppointmentPublic,
  CongressGuidePublic,
  CongressPublic
} from '@assembla-med/shared'

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

const { data: congressData } = await useAsyncData(`congress-${congressId}`, () =>
  api<{ congress: CongressPublic }>(`/organizations/${orgId}/congresses/${congressId}`)
)
const { data: summary } = await useAsyncData(`congress-summary-${congressId}`, () =>
  api<{ appointments: number, checkIns: number, activeCheckIns: number }>(
    `/organizations/${orgId}/congresses/${congressId}/summary`
  )
)
const { data: appointments } = await useAsyncData(`congress-appts-${congressId}`, () =>
  api<{ appointments: AppointmentPublic[] }>(
    `/organizations/${orgId}/appointments?congressId=${congressId}`
  )
)
const { data: guideData, refresh: refreshGuide } = await useAsyncData(
  `congress-guide-${congressId}`,
  () => api<{ guide: CongressGuidePublic }>(
    `/organizations/${orgId}/congresses/${congressId}/guide`
  )
)

const guideForm = reactive({
  agendaMarkdown: '',
  floorPlanUrl: '',
  boothNotes: '',
  logisticsMarkdown: '',
  contactsMarkdown: '',
  lodgingMarkdown: '',
  safetyMarkdown: '',
  disclosuresMarkdown: ''
})

watch(() => guideData.value?.guide, (guide) => {
  if (!guide) return
  guideForm.agendaMarkdown = guide.agendaMarkdown || ''
  guideForm.floorPlanUrl = guide.floorPlanUrl || ''
  guideForm.boothNotes = guide.boothNotes || ''
  guideForm.logisticsMarkdown = guide.logisticsMarkdown || ''
  guideForm.contactsMarkdown = guide.contactsMarkdown || ''
  guideForm.lodgingMarkdown = guide.lodgingMarkdown || ''
  guideForm.safetyMarkdown = guide.safetyMarkdown || ''
  guideForm.disclosuresMarkdown = guide.disclosuresMarkdown || ''
}, { immediate: true })

const savingGuide = ref(false)
const guideError = ref('')

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
        logisticsMarkdown: guideForm.logisticsMarkdown || null,
        contactsMarkdown: guideForm.contactsMarkdown || null,
        lodgingMarkdown: guideForm.lodgingMarkdown || null,
        safetyMarkdown: guideForm.safetyMarkdown || null,
        disclosuresMarkdown: guideForm.disclosuresMarkdown || null
      }
    })
    await refreshGuide()
    toast.add({ title: 'Event guide saved', color: 'success' })
  } catch (e: unknown) {
    guideError.value = (e as { data?: { message?: string | string[] } })?.data?.message
      ? Array.isArray((e as { data?: { message?: string | string[] } }).data?.message)
        ? ((e as { data: { message: string[] } }).data.message).join(', ')
        : String((e as { data?: { message?: string } }).data?.message)
      : 'Unable to save guide'
  } finally {
    savingGuide.value = false
  }
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
  a.download = `${congressData.value?.congress.name || 'congress'}-check-ins.csv`
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
  a.download = `${congressData.value?.congress.name || 'congress'}-cvent-import.csv`
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
          {{ congressData?.congress.name }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ congressData?.congress.location || 'No location' }}
          · {{ congressData?.congress.status }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
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

    <div class="grid gap-3 sm:grid-cols-3">
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
          Check-ins
        </p>
        <p class="mt-1 text-2xl font-semibold text-highlighted">
          {{ summary?.checkIns ?? '—' }}
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
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <div>
        <h2 class="font-medium text-highlighted">
          Event guide
        </h2>
        <p class="text-xs text-muted mt-1">
          Content shown in the Event App for booth and field staff.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField
          label="Agenda"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.agendaMarkdown"
            :rows="4"
            class="w-full"
            placeholder="Day 1 keynotes, booth hours…"
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
            placeholder="Ops lead, medical lead…"
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
            placeholder="Emergency contact, rally point, hospital…"
          />
        </UFormField>
        <UFormField
          label="Disclosures"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="guideForm.disclosuresMarkdown"
            :rows="3"
            class="w-full"
            placeholder="Symposiums, posters, presentations…"
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
