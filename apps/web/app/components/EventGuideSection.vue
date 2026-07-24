<script setup lang="ts">
defineProps<{
  title: string
  body?: string | null
  empty?: string
  url?: string | null
  urlLabel?: string
}>()
</script>

<template>
  <section class="space-y-2">
    <h2 class="text-sm font-medium text-highlighted">
      {{ title }}
    </h2>
    <a
      v-if="url"
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex text-sm text-primary underline-offset-2 hover:underline"
    >
      {{ urlLabel || 'Open link' }}
    </a>
    <p
      v-if="body"
      class="whitespace-pre-wrap rounded-lg border border-default bg-default px-3 py-3 text-sm text-muted"
    >
      {{ body }}
    </p>
    <p
      v-else-if="!url"
      class="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-muted"
    >
      {{ empty || 'Not filled in yet. Add this in Console → Congress → Event guide.' }}
    </p>
  </section>
</template>
