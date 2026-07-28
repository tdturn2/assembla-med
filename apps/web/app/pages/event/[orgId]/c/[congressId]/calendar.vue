<script setup lang="ts">
import type { AppointmentPublic, CongressPublic } from '@assembla-med/shared'
import { formatInTimeZone, resolveTimeZone } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string
const { user } = useAuth()

definePageMeta({
  layout: 'event',
  title: 'Schedule'
})

const { api } = useApi()
const tab = ref<'company' | 'mine'>('company')

const { data, pending } = await useAsyncData(
  `event-calendar-${orgId}-${congressId}`,
  async () => {
    const [congressRes, appointmentsRes] = await Promise.all([
      api<{ congress: CongressPublic }>(
        `/organizations/${orgId}/congresses/${congressId}`
      ),
      api<{ appointments: AppointmentPublic[] }>(
        `/organizations/${orgId}/appointments?congressId=${congressId}`
      )
    ])
    return {
      congress: congressRes.congress,
      appointments: appointmentsRes.appointments.filter(a => a.status !== 'cancelled')
    }
  }
)

const visible = computed(() => {
  const list = data.value?.appointments || []
  if (tab.value === 'company') return list
  const uid = user.value?.id
  if (!uid) return []
  return list.filter(a =>
    a.createdById === uid
    || a.attendees?.some(att => att.userId === uid)
  )
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-highlighted tracking-tight">
        Schedule
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ data?.congress.name || 'Congress' }} appointments
      </p>
    </div>

    <div class="flex gap-2">
      <UButton
        size="sm"
        :variant="tab === 'company' ? 'solid' : 'outline'"
        color="neutral"
        @click="tab = 'company'"
      >
        Company
      </UButton>
      <UButton
        size="sm"
        :variant="tab === 'mine' ? 'solid' : 'outline'"
        color="neutral"
        @click="tab = 'mine'"
      >
        Mine
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
        v-for="appt in visible"
        :key="appt.id"
        class="px-3 py-3 space-y-1"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ appt.title }}
        </p>
        <p class="text-xs text-muted">
          {{ formatInTimeZone(appt.startTime, resolveTimeZone(data?.congress?.timezone)) }}
          –
          {{ formatInTimeZone(appt.endTime, resolveTimeZone(data?.congress?.timezone)) }}
          <span> · {{ resolveTimeZone(data?.congress?.timezone) }}</span>
        </p>
        <p class="text-xs text-muted">
          <span v-if="appt.location">{{ appt.location }} · </span>
          {{ appt.engagementType.replace('_', ' ') }}
          <span v-if="appt.isContracted"> · contracted</span>
        </p>
        <p
          v-if="appt.attendees?.length"
          class="text-xs text-muted"
        >
          Attendees:
          {{ appt.attendees.map(a => a.name).join(', ') }}
        </p>
        <p class="text-xs font-mono text-muted">
          Code {{ appt.checkInCode }}
        </p>
      </li>
      <li
        v-if="!visible.length"
        class="px-3 py-6 text-sm text-muted"
      >
        {{ tab === 'mine' ? 'No personal appointments assigned.' : 'No appointments yet.' }}
      </li>
    </ul>
  </div>
</template>
