<script setup lang="ts">
import type { OrganizationPublic } from '@assembla-med/shared'

definePageMeta({
  layout: 'console',
  title: 'Organizations'
})

const { api } = useApi()
const { createOrganization, refreshMe } = useAuth()

const { data, pending, refresh } = await useAsyncData('organizations', () =>
  api<{ organizations: OrganizationPublic[] }>('/organizations')
)

const name = ref('')
const error = ref('')
const creating = ref(false)

async function onCreate() {
  error.value = ''
  creating.value = true
  try {
    const org = await createOrganization(name.value)
    name.value = ''
    await refreshMe()
    await refresh()
    await navigateTo(`/app/${org.id}`)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Unable to create organization'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-3xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Organizations
      </h1>
      <p class="mt-1 text-sm text-muted">
        Choose a tenant workspace to manage congresses and KOL engagement.
      </p>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
      <h2 class="font-medium text-highlighted">
        Create organization
      </h2>
      <div class="flex flex-col sm:flex-row gap-3">
        <UInput
          v-model="name"
          placeholder="Organization name"
          class="flex-1"
          @keyup.enter="onCreate"
        />
        <UButton
          :loading="creating"
          :disabled="name.trim().length < 2"
          @click="onCreate"
        >
          Create
        </UButton>
      </div>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="String(error)"
      />
    </div>

    <div
      v-if="pending"
      class="text-muted text-sm"
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
          :to="`/app/${org.id}`"
          class="flex items-center justify-between px-4 py-3 hover:bg-elevated/50"
        >
          <div>
            <p class="font-medium text-highlighted">
              {{ org.name }}
            </p>
            <p class="text-xs text-muted uppercase tracking-wide">
              {{ org.subscriptionTier }}
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
        No organizations yet. Create one to continue.
      </li>
    </ul>
  </div>
</template>
