<script setup lang="ts">
import type { CongressGuidePublic, CongressPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string

definePageMeta({
  layout: 'event',
  title: 'About congress'
})

const { api } = useApi()

const { data, pending } = await useAsyncData(
  `event-about-${orgId}-${congressId}`,
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
        About congress
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ data?.congress.name }} · agenda, floor plan, booth
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
        title="Agenda"
        :body="data.guide.agendaMarkdown"
      />
      <EventGuideSection
        title="Floor plan"
        :url="data.guide.floorPlanUrl"
        url-label="Open floor plan"
        empty="No floor plan URL yet."
      />
      <EventGuideSection
        title="Booth notes"
        :body="data.guide.boothNotes"
      />
    </template>
  </div>
</template>
