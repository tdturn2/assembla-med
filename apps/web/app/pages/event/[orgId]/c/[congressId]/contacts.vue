<script setup lang="ts">
import type { CongressGuidePublic, CongressPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string

definePageMeta({
  layout: 'event',
  title: 'Contacts'
})

const { api } = useApi()

const { data, pending } = await useAsyncData(
  `event-contacts-${orgId}-${congressId}`,
  async () => {
    const [congressRes, guideRes] = await Promise.all([
      api<{ congress: CongressPublic }>(
        `/organizations/${orgId}/congresses/${congressId}`
      ),
      api<{ guide: CongressGuidePublic }>(
        `/organizations/${orgId}/congresses/${congressId}/guide`
      )
    ])
    return { congress: congressRes.congress, guide: guideRes.guide }
  }
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-highlighted tracking-tight">
        Contacts
      </h1>
      <p class="mt-1 text-sm text-muted">
        Logistics and teammates · {{ data?.congress.name }}
      </p>
    </div>
    <div
      v-if="pending"
      class="text-sm text-muted"
    >
      Loading…
    </div>
    <template v-else-if="data">
      <EventGuideSection
        title="Logistics"
        :body="data.guide.logisticsMarkdown"
      />
      <EventGuideSection
        title="Team contacts"
        :body="data.guide.contactsMarkdown"
      />
    </template>
  </div>
</template>
