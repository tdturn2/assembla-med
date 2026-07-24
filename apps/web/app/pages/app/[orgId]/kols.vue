<script setup lang="ts">
import type { KolPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string

definePageMeta({
  layout: 'console',
  title: 'KOLs'
})

const { api } = useApi()
const toast = useToast()

const { data, pending, refresh } = await useAsyncData(`kols-${orgId}`, () =>
  api<{ kols: KolPublic[] }>(`/organizations/${orgId}/kols`)
)

const form = reactive({
  name: '',
  email: '',
  institution: '',
  therapeuticArea: '',
  region: ''
})
const csv = ref('name,email,institution,therapeuticArea,region\n')
const error = ref('')
const creating = ref(false)
const importing = ref(false)

async function onCreate() {
  error.value = ''
  creating.value = true
  try {
    await api(`/organizations/${orgId}/kols`, {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email || undefined,
        institution: form.institution || undefined,
        therapeuticArea: form.therapeuticArea || undefined,
        region: form.region || undefined
      }
    })
    form.name = ''
    form.email = ''
    form.institution = ''
    form.therapeuticArea = ''
    form.region = ''
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Unable to create KOL'
  } finally {
    creating.value = false
  }
}

async function onImport() {
  error.value = ''
  importing.value = true
  try {
    const result = await api<{ created: KolPublic[], skipped: unknown[] }>(
      `/organizations/${orgId}/kols/import`,
      { method: 'POST', body: { csv: csv.value } }
    )
    toast.add({
      title: `Imported ${result.created.length} KOLs`,
      description: result.skipped.length
        ? `${result.skipped.length} skipped`
        : undefined,
      color: 'success'
    })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Import failed'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        KOLs
      </h1>
      <p class="mt-1 text-sm text-muted">
        Organization-scoped contacts for targeting and appointments.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-default bg-default p-4 space-y-3">
        <h2 class="font-medium text-highlighted">
          Add KOL
        </h2>
        <UFormField label="Name">
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Email">
          <UInput
            v-model="form.email"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Institution">
          <UInput
            v-model="form.institution"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Therapeutic area">
          <UInput
            v-model="form.therapeuticArea"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Region">
          <UInput
            v-model="form.region"
            class="w-full"
          />
        </UFormField>
        <UButton
          :loading="creating"
          :disabled="form.name.trim().length < 2"
          @click="onCreate"
        >
          Add KOL
        </UButton>
      </div>

      <div class="rounded-lg border border-default bg-default p-4 space-y-3">
        <h2 class="font-medium text-highlighted">
          CSV import
        </h2>
        <UTextarea
          v-model="csv"
          :rows="10"
          class="w-full font-mono text-xs"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :loading="importing"
          @click="onImport"
        >
          Import CSV
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="String(error)"
    />

    <div
      v-if="pending"
      class="text-sm text-muted"
    >
      Loading…
    </div>
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-default bg-default"
    >
      <table class="min-w-full text-sm">
        <thead class="border-b border-default text-left text-muted">
          <tr>
            <th class="px-4 py-2 font-medium">
              Name
            </th>
            <th class="px-4 py-2 font-medium">
              Email
            </th>
            <th class="px-4 py-2 font-medium">
              Institution
            </th>
            <th class="px-4 py-2 font-medium">
              Area
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="kol in data?.kols || []"
            :key="kol.id"
            class="border-b border-default/70"
          >
            <td class="px-4 py-2 text-highlighted">
              {{ kol.name }}
            </td>
            <td class="px-4 py-2">
              {{ kol.email || '—' }}
            </td>
            <td class="px-4 py-2">
              {{ kol.institution || '—' }}
            </td>
            <td class="px-4 py-2">
              {{ kol.therapeuticArea || '—' }}
            </td>
          </tr>
          <tr v-if="!(data?.kols || []).length">
            <td
              colspan="4"
              class="px-4 py-6 text-muted"
            >
              No KOLs yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
