<script setup lang="ts">
import type { CongressPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string

definePageMeta({
  layout: 'event',
  title: 'Congresses'
})

const { api } = useApi()

const { data, pending } = await useAsyncData(`event-congresses-${orgId}`, () =>
  api<{ congresses: CongressPublic[] }>(`/organizations/${orgId}/congresses`)
)

const sorted = computed(() => {
  const list = [...(data.value?.congresses || [])]
  const rank = (status: CongressPublic['status']) => {
    if (status === 'active') return 0
    if (status === 'planning') return 1
    return 2
  }
  return list.sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    return (a.startDate || '').localeCompare(b.startDate || '')
  })
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-highlighted tracking-tight">
        Your congresses
      </h1>
      <p class="mt-1 text-sm text-muted">
        Open a congress for schedule, logistics, and check-in.
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
      class="space-y-3"
    >
      <li
        v-for="congress in sorted"
        :key="congress.id"
      >
        <NuxtLink
          :to="`/event/${orgId}/c/${congress.id}`"
          class="block rounded-lg border border-default bg-default px-4 py-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-highlighted">
                {{ congress.name }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{ congress.location || 'Location TBD' }}
                <span v-if="congress.startDate"> · {{ congress.startDate }}</span>
              </p>
            </div>
            <UBadge
              :color="congress.status === 'active' ? 'primary' : 'neutral'"
              variant="subtle"
            >
              {{ congress.status }}
            </UBadge>
          </div>
        </NuxtLink>
      </li>
      <li
        v-if="!sorted.length"
        class="rounded-lg border border-default px-4 py-6 text-sm text-muted"
      >
        No congresses yet. Create one in Console.
      </li>
    </ul>
  </div>
</template>
