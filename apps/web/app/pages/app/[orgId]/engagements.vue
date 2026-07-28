<script setup lang="ts">
const route = useRoute()
const orgId = route.params.orgId as string

definePageMeta({
  layout: 'console',
  title: 'Engagements'
})

const tab = computed(() => {
  const value = route.query.tab
  if (value === 'outreach') return 'outreach'
  if (value === 'requests') return 'requests'
  return 'schedule'
})

const scheduleTo = computed(() => `/app/${orgId}/appointments`)
const requestsTo = computed(() => `/app/${orgId}/meeting-requests`)
const outreachTo = computed(() => `/app/${orgId}/outreach`)
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Engagements
      </h1>
      <p class="mt-1 text-sm text-muted">
        Request demand, schedule appointments, then invite KOLs.
      </p>
    </div>

    <div class="flex gap-2 border-b border-default pb-2">
      <UButton
        size="sm"
        :color="tab === 'requests' ? 'primary' : 'neutral'"
        :variant="tab === 'requests' ? 'solid' : 'ghost'"
        :to="requestsTo"
      >
        Requests
      </UButton>
      <UButton
        size="sm"
        :color="tab === 'schedule' ? 'primary' : 'neutral'"
        :variant="tab === 'schedule' ? 'solid' : 'ghost'"
        :to="scheduleTo"
      >
        Schedule
      </UButton>
      <UButton
        size="sm"
        :color="tab === 'outreach' ? 'primary' : 'neutral'"
        :variant="tab === 'outreach' ? 'solid' : 'ghost'"
        :to="outreachTo"
      >
        Outreach
      </UButton>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <NuxtLink
        :to="requestsTo"
        class="rounded-lg border border-default bg-default p-4 hover:bg-elevated/50"
      >
        <p class="font-medium text-highlighted">
          Meeting requests
        </p>
        <p class="mt-1 text-sm text-muted">
          Capture demand before room and time.
        </p>
      </NuxtLink>
      <NuxtLink
        :to="scheduleTo"
        class="rounded-lg border border-default bg-default p-4 hover:bg-elevated/50"
      >
        <p class="font-medium text-highlighted">
          Appointments
        </p>
        <p class="mt-1 text-sm text-muted">
          Book rooms, manage attendees, track conflicts.
        </p>
      </NuxtLink>
      <NuxtLink
        :to="outreachTo"
        class="rounded-lg border border-default bg-default p-4 hover:bg-elevated/50"
      >
        <p class="font-medium text-highlighted">
          Outreach
        </p>
        <p class="mt-1 text-sm text-muted">
          Templates, campaigns, and KOL invitations.
        </p>
      </NuxtLink>
    </div>
  </div>
</template>
