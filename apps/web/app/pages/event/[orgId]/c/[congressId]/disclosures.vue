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

const items = computed(() => data.value?.guide.disclosureItems || [])
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-highlighted tracking-tight">
        Disclosures
      </h1>
      <p class="mt-1 text-sm text-muted">
        Symposiums, presentations, posters
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
      <ul
        v-if="items.length"
        class="divide-y divide-default rounded-lg border border-default bg-default"
      >
        <li
          v-for="(item, index) in items"
          :key="index"
          class="px-3 py-3"
        >
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm font-medium text-primary"
          >
            {{ item.title }}
          </a>
          <p
            v-else
            class="text-sm font-medium text-highlighted"
          >
            {{ item.title }}
          </p>
          <p
            v-if="item.description"
            class="mt-1 text-xs text-muted"
          >
            {{ item.description }}
          </p>
        </li>
      </ul>
      <EventGuideSection
        v-if="data.guide.disclosuresMarkdown"
        title="Notes"
        :body="data.guide.disclosuresMarkdown"
      />
      <p
        v-else-if="!items.length"
        class="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-muted"
      >
        No disclosures yet.
      </p>
    </template>
  </div>
</template>
