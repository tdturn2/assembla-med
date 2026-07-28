<script setup lang="ts">
import type { CongressPublic } from '@assembla-med/shared'
import { COMMON_TIMEZONES } from '@assembla-med/shared'

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
  cventId: '',
  companyContactName: '',
  companyContactEmail: '',
  websiteUrl: '',
  location: '',
  timezone: 'America/New_York',
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
        cventId: form.cventId || undefined,
        companyContactName: form.companyContactName || undefined,
        companyContactEmail: form.companyContactEmail || undefined,
        websiteUrl: form.websiteUrl || undefined,
        location: form.location || undefined,
        timezone: form.timezone,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status
      }
    })
    form.name = ''
    form.cventId = ''
    form.companyContactName = ''
    form.companyContactEmail = ''
    form.websiteUrl = ''
    form.location = ''
    form.timezone = 'America/New_York'
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
  <div class="space-y-8 max-w-5xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Congresses
      </h1>
      <p class="mt-1 text-sm text-muted">
        Plan events with CVENT ID and company contact on each tile.
      </p>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <h2 class="font-medium text-highlighted">
        New congress
      </h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Congress name">
          <UInput
            v-model="form.name"
            class="w-full"
            placeholder="DDW 2026"
          />
        </UFormField>
        <UFormField label="CVENT ID">
          <UInput
            v-model="form.cventId"
            class="w-full"
            placeholder="EVT-…"
          />
        </UFormField>
        <UFormField label="Company contact">
          <UInput
            v-model="form.companyContactName"
            class="w-full"
            placeholder="Ops lead name"
          />
        </UFormField>
        <UFormField label="Contact email">
          <UInput
            v-model="form.companyContactEmail"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Congress website">
          <UInput
            v-model="form.websiteUrl"
            class="w-full"
            placeholder="https://"
          />
        </UFormField>
        <UFormField label="Location">
          <UInput
            v-model="form.location"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Venue timezone">
          <select
            v-model="form.timezone"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="tz in COMMON_TIMEZONES"
              :key="tz.value"
              :value="tz.value"
            >
              {{ tz.label }}
            </option>
          </select>
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
    <div
      v-else
      class="grid gap-3 sm:grid-cols-2"
    >
      <NuxtLink
        v-for="congress in data?.congresses || []"
        :key="congress.id"
        :to="`/app/${orgId}/congresses/${congress.id}`"
        class="rounded-lg border border-default bg-default p-4 transition-colors hover:bg-elevated/50"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-highlighted tracking-tight truncate">
              {{ congress.name }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ congress.location || 'No location' }}
              · {{ congress.timezone || 'UTC' }}
              · {{ congress.status }}
              <span v-if="congress.startDate"> · {{ congress.startDate }}</span>
            </p>
          </div>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 text-muted mt-1"
          />
        </div>
        <dl class="mt-3 grid gap-1 text-xs">
          <div class="flex gap-2">
            <dt class="text-muted shrink-0">
              CVENT
            </dt>
            <dd class="text-highlighted truncate">
              {{ congress.cventId || '—' }}
            </dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-muted shrink-0">
              Contact
            </dt>
            <dd class="text-highlighted truncate">
              {{ congress.companyContactName || '—' }}
              <span
                v-if="congress.companyContactEmail"
                class="text-muted"
              > · {{ congress.companyContactEmail }}</span>
            </dd>
          </div>
        </dl>
      </NuxtLink>
      <p
        v-if="!(data?.congresses || []).length"
        class="sm:col-span-2 rounded-lg border border-default px-4 py-6 text-sm text-muted"
      >
        No congresses yet.
      </p>
    </div>
  </div>
</template>
