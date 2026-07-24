<script setup lang="ts">
import type { OrganizationPublic } from '@assembla-med/shared'

definePageMeta({
  layout: 'event',
  title: 'Organizations'
})

const { api } = useApi()
const { memberships } = useAuth()

const { data, pending } = await useAsyncData('event-organizations', () =>
  api<{ organizations: OrganizationPublic[] }>('/organizations')
)

watchEffect(() => {
  const orgs = data.value?.organizations || []
  if (orgs.length === 1) {
    navigateTo(`/event/${orgs[0].id}`)
  }
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-highlighted tracking-tight">
        Event App
      </h1>
      <p class="mt-1 text-sm text-muted">
        Choose an organization to open today’s congress companion.
      </p>
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
        v-for="org in data?.organizations || []"
        :key="org.id"
      >
        <NuxtLink
          :to="`/event/${org.id}`"
          class="flex items-center justify-between px-4 py-3"
        >
          <div>
            <p class="font-medium text-highlighted">
              {{ org.name }}
            </p>
            <p class="text-xs text-muted">
              {{ memberships.find(m => m.organizationId === org.id)?.role || 'member' }}
            </p>
          </div>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 text-muted"
          />
        </NuxtLink>
      </li>
      <li
        v-if="!(data?.organizations || []).length"
        class="px-4 py-6 text-sm text-muted"
      >
        No organizations yet. Create one in Console first.
      </li>
    </ul>
  </div>
</template>
