<script setup lang="ts">
import type { CongressGuidePublic, CongressPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string

definePageMeta({
  layout: 'event',
  title: 'ICW'
})

const { api } = useApi()

const { data, pending } = await useAsyncData(
  `event-icw-${orgId}-${congressId}`,
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
        In Congress Week
      </h1>
      <p class="mt-1 text-sm text-muted">
        Dinners, receptions, ad boards, work & meeting rooms
        <span v-if="data?.congress.name"> · {{ data.congress.name }}</span>
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
        title="Dinners"
        :body="data.guide.icwDinnersMarkdown"
        empty="No dinners listed (invite-only when published)."
      />
      <EventGuideSection
        title="Reception"
        :body="data.guide.icwReceptionMarkdown"
      />
      <EventGuideSection
        title="Ad boards"
        :body="data.guide.icwAdBoardsMarkdown"
        empty="No ad boards listed (invite-only when published)."
      />
      <EventGuideSection
        title="Work room"
        :body="data.guide.icwWorkRoomMarkdown"
      />
      <EventGuideSection
        title="Meeting rooms"
        :body="data.guide.icwMeetingRoomsMarkdown"
      />
    </template>
  </div>
</template>
