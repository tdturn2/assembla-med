<script setup lang="ts">
import type { CongressGuidePublic, CongressPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string

definePageMeta({
  layout: 'event',
  title: 'Disclosures'
})

const { api } = useApi()

const { data, pending } = await useAsyncData(
  `event-disclosures-${orgId}-${congressId}`,
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
        Data disclosures
      </h1>
      <p class="mt-1 text-sm text-muted">
        Symposiums, presentations, posters · {{ data?.congress.name }}
      </p>
    </div>
    <div
      v-if="pending"
      class="text-sm text-muted"
    >
      Loading…
    </div>
    <EventGuideSection
      v-else-if="data"
      title="Disclosures"
      :body="data.guide.disclosuresMarkdown"
    />
  </div>
</template>
