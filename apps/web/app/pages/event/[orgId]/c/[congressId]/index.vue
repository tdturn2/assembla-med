<script setup lang="ts">
import type {
  AppointmentPublic,
  CongressGuidePublic,
  CongressPublic
} from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string

definePageMeta({
  layout: 'event',
  title: 'Congress home'
})

const { api } = useApi()

const { data, pending } = await useAsyncData(
  `event-hub-${orgId}-${congressId}`,
  async () => {
    const [congressRes, guideRes, appointmentsRes] = await Promise.all([
      api<{ congress: CongressPublic }>(
        `/organizations/${orgId}/congresses/${congressId}`
      ),
      api<{ guide: CongressGuidePublic }>(
        `/organizations/${orgId}/congresses/${congressId}/guide`
      ),
      api<{ appointments: AppointmentPublic[] }>(
        `/organizations/${orgId}/appointments?congressId=${congressId}`
      )
    ])
    return {
      congress: congressRes.congress,
      guide: guideRes.guide,
      appointments: appointmentsRes.appointments
    }
  }
)

const upcoming = computed(() => {
  const now = Date.now()
  return (data.value?.appointments || [])
    .filter(a => a.status !== 'cancelled' && new Date(a.endTime).getTime() >= now)
    .slice(0, 4)
})

const base = `/event/${orgId}/c/${congressId}`

const links = [
  { label: 'Schedule', to: `${base}/calendar`, description: 'Company appointments' },
  { label: 'About & booth', to: `${base}/about`, description: 'Agenda, floor plan, booth' },
  { label: 'Lodging', to: `${base}/lodging`, description: 'Hotel and nearby food' },
  { label: 'Contacts', to: `${base}/contacts`, description: 'Logistics & teammates' },
  { label: 'Disclosures', to: `${base}/disclosures`, description: 'Symposiums & posters' },
  { label: 'Safety', to: `${base}/safety`, description: 'Emergency & rally points' },
  { label: 'Check-in', to: `${base}/check-in`, description: 'Code / QR ToV capture' }
]
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="pending"
      class="text-sm text-muted"
    >
      Loading…
    </div>
    <template v-else-if="data">
      <div>
        <p class="text-xs uppercase tracking-wide text-muted">
          {{ data.congress.status }}
        </p>
        <h1 class="mt-1 text-xl font-semibold text-highlighted tracking-tight">
          {{ data.congress.name }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ data.congress.location || 'Location TBD' }}
          <span v-if="data.congress.startDate"> · {{ data.congress.startDate }}</span>
          <span v-if="data.congress.endDate">–{{ data.congress.endDate }}</span>
        </p>
      </div>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-highlighted">
            Up next
          </h2>
          <NuxtLink
            :to="`${base}/calendar`"
            class="text-xs text-muted"
          >
            Full schedule
          </NuxtLink>
        </div>
        <ul class="divide-y divide-default rounded-lg border border-default bg-default">
          <li
            v-for="appt in upcoming"
            :key="appt.id"
            class="px-3 py-2.5"
          >
            <p class="text-sm font-medium text-highlighted">
              {{ appt.title }}
            </p>
            <p class="text-xs text-muted">
              {{ new Date(appt.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }}
              <span v-if="appt.kol"> · {{ appt.kol.name }}</span>
              <span v-if="appt.isContracted"> · contracted</span>
            </p>
          </li>
          <li
            v-if="!upcoming.length"
            class="px-3 py-4 text-sm text-muted"
          >
            No upcoming appointments.
          </li>
        </ul>
      </section>

      <section
        v-if="data.guide.agendaMarkdown"
        class="space-y-2"
      >
        <h2 class="text-sm font-medium text-highlighted">
          Agenda snapshot
        </h2>
        <p class="whitespace-pre-wrap rounded-lg border border-default bg-default px-3 py-3 text-sm text-muted">
          {{ data.guide.agendaMarkdown.slice(0, 280) }}{{ data.guide.agendaMarkdown.length > 280 ? '…' : '' }}
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-sm font-medium text-highlighted">
          Day-of tools
        </h2>
        <ul class="grid gap-2">
          <li
            v-for="link in links"
            :key="link.to"
          >
            <NuxtLink
              :to="link.to"
              class="flex items-center justify-between rounded-lg border border-default bg-default px-3 py-3"
            >
              <div>
                <p class="text-sm font-medium text-highlighted">
                  {{ link.label }}
                </p>
                <p class="text-xs text-muted">
                  {{ link.description }}
                </p>
              </div>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 text-muted"
              />
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
