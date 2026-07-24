<script setup lang="ts">
import type { CongressPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string

definePageMeta({
  layout: 'console',
  title: 'Congresses'
})

const { api } = useApi()

const { data, pending, refresh } = await useAsyncData(`congresses-${orgId}`, () =>
  api<{ congresses: CongressPublic[] }>(`/organizations/${orgId}/congresses`)
)

const form = reactive({
  name: '',
  location: '',
  startDate: '',
  endDate: '',
  status: 'planning' as CongressPublic['status']
})
const error = ref('')
const creating = ref(false)

async function onCreate() {
  error.value = ''
  creating.value = true
  try {
    await api(`/organizations/${orgId}/congresses`, {
      method: 'POST',
      body: {
        name: form.name,
        location: form.location || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status
      }
    })
    form.name = ''
    form.location = ''
    form.startDate = ''
    form.endDate = ''
    form.status = 'planning'
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Unable to create congress'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
          Congresses
        </h1>
        <p class="mt-1 text-sm text-muted">
          Plan and track events for this organization.
        </p>
      </div>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <h2 class="font-medium text-highlighted">
        New congress
      </h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Name">
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Location">
          <UInput
            v-model="form.location"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Start date">
          <UInput
            v-model="form.startDate"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField label="End date">
          <UInput
            v-model="form.endDate"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Status">
          <USelect
            v-model="form.status"
            :items="[
              { label: 'Planning', value: 'planning' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' }
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="String(error)"
      />
      <UButton
        :loading="creating"
        :disabled="form.name.trim().length < 2"
        @click="onCreate"
      >
        Create congress
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
        v-for="congress in data?.congresses || []"
        :key="congress.id"
      >
        <NuxtLink
          :to="`/app/${orgId}/congresses/${congress.id}`"
          class="flex items-center justify-between px-4 py-3 hover:bg-elevated/50"
        >
          <div>
            <p class="font-medium text-highlighted">
              {{ congress.name }}
            </p>
            <p class="text-xs text-muted">
              {{ congress.location || 'No location' }}
              · {{ congress.status }}
              <span v-if="congress.startDate"> · {{ congress.startDate }}</span>
            </p>
          </div>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 text-muted"
          />
        </NuxtLink>
      </li>
      <li
        v-if="!(data?.congresses || []).length"
        class="px-4 py-6 text-sm text-muted"
      >
        No congresses yet.
      </li>
    </ul>
  </div>
</template>
