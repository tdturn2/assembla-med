<script setup lang="ts">
import type {
  CampaignPublic,
  CongressPublic,
  InvitationTemplatePublic,
  KolPublic
} from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const toast = useToast()
const { api } = useApi()

definePageMeta({
  layout: 'console',
  title: 'Outreach'
})

const { data, pending, refresh } = await useAsyncData(`outreach-${orgId}`, async () => {
  const [templatesRes, campaignsRes, kolsRes, congressesRes] = await Promise.all([
    api<{ templates: InvitationTemplatePublic[] }>(`/organizations/${orgId}/outreach/templates`),
    api<{ campaigns: CampaignPublic[] }>(`/organizations/${orgId}/outreach/campaigns`),
    api<{ kols: KolPublic[] }>(`/organizations/${orgId}/kols`),
    api<{ congresses: CongressPublic[] }>(`/organizations/${orgId}/congresses`)
  ])
  return {
    templates: templatesRes.templates,
    campaigns: campaignsRes.campaigns,
    kols: kolsRes.kols,
    congresses: congressesRes.congresses
  }
})

const templates = computed(() => data.value?.templates || [])
const campaigns = computed(() => data.value?.campaigns || [])
const kols = computed(() => data.value?.kols || [])
const congresses = computed(() => data.value?.congresses || [])

async function refreshTemplates() {
  await refresh()
}
async function refreshCampaigns() {
  await refresh()
}

const templateForm = reactive({
  name: 'Congress invitation',
  subject: 'Invitation: {{congress}}',
  bodyHtml: '<p>Dear {{name}},</p><p>You are invited to meet with our team at <strong>{{congress}}</strong>.</p><p>Please use the link below to respond.</p>'
})
const campaignForm = reactive({
  name: '',
  templateId: '',
  congressId: '',
  kolIds: [] as string[],
  engagementType: 'meeting' as 'meeting' | 'advisory_board' | 'contracted_talk' | 'informal' | 'other',
  isContracted: false
})

const engagementOptions = [
  { label: 'Meeting', value: 'meeting' },
  { label: 'Advisory board', value: 'advisory_board' },
  { label: 'Contracted talk', value: 'contracted_talk' },
  { label: 'Informal', value: 'informal' },
  { label: 'Other', value: 'other' }
]

watch(() => campaignForm.engagementType, (type) => {
  if (type === 'contracted_talk') {
    campaignForm.isContracted = true
  }
})
const error = ref('')
const creatingTemplate = ref(false)
const creatingCampaign = ref(false)
const sendingId = ref<string | null>(null)
const selectedCampaign = ref<CampaignPublic | null>(null)

watch(templates, (list) => {
  if (!campaignForm.templateId && list[0]) {
    campaignForm.templateId = list[0].id
  }
}, { immediate: true })

const templateItems = computed(() =>
  templates.value.map(t => ({ label: t.name, value: t.id }))
)
const congressItems = computed(() => [
  { label: 'No congress', value: '' },
  ...congresses.value.map(c => ({ label: c.name, value: c.id }))
])
const kolOptions = computed(() =>
  kols.value
    .filter(k => k.email)
    .map(k => ({ label: `${k.name} <${k.email}>`, value: k.id }))
)

async function createTemplate() {
  error.value = ''
  creatingTemplate.value = true
  try {
    await api(`/organizations/${orgId}/outreach/templates`, {
      method: 'POST',
      body: { ...templateForm }
    })
    await refreshTemplates()
    toast.add({ title: 'Template saved', color: 'success' })
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Template failed'
  } finally {
    creatingTemplate.value = false
  }
}

async function createCampaign() {
  error.value = ''
  creatingCampaign.value = true
  try {
    const result = await api<{ campaign: CampaignPublic }>(
      `/organizations/${orgId}/outreach/campaigns`,
      {
        method: 'POST',
        body: {
          name: campaignForm.name,
          templateId: campaignForm.templateId,
          congressId: campaignForm.congressId || undefined,
          kolIds: campaignForm.kolIds,
          engagementType: campaignForm.engagementType,
          isContracted: campaignForm.isContracted
        }
      }
    )
    campaignForm.name = ''
    campaignForm.kolIds = []
    campaignForm.isContracted = campaignForm.engagementType === 'contracted_talk'
    await refreshCampaigns()
    selectedCampaign.value = result.campaign
    toast.add({ title: 'Campaign created', color: 'success' })
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Campaign failed'
  } finally {
    creatingCampaign.value = false
  }
}

async function sendCampaign(campaignId: string) {
  sendingId.value = campaignId
  error.value = ''
  try {
    const result = await api<{ sent: number, failed: number, campaign: CampaignPublic }>(
      `/organizations/${orgId}/outreach/campaigns/${campaignId}/send`,
      { method: 'POST' }
    )
    await refreshCampaigns()
    selectedCampaign.value = result.campaign
    toast.add({
      title: `Sent ${result.sent}`,
      description: result.failed ? `${result.failed} failed` : 'Delivered via Mailgun (test redirect may apply)',
      color: result.failed ? 'warning' : 'success'
    })
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Send failed'
  } finally {
    sendingId.value = null
  }
}

async function openCampaign(campaignId: string) {
  const result = await api<{ campaign: CampaignPublic }>(
    `/organizations/${orgId}/outreach/campaigns/${campaignId}`
  )
  selectedCampaign.value = result.campaign
}
</script>

<template>
  <div class="space-y-8 max-w-5xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Outreach
      </h1>
      <p class="mt-1 text-sm text-muted">
        Templates and campaigns. Local sends redirect to the Mailgun test inbox.
        Merge fields:
        <code>{&#123;name&#125;}</code>,
        <code>{&#123;email&#125;}</code>,
        <code>{&#123;institution&#125;}</code>,
        <code>{&#123;congress&#125;}</code>,
        <code>{&#123;organization&#125;}</code>.
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="String(error)"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-default bg-default p-4 space-y-3">
        <h2 class="font-medium text-highlighted">
          Invitation template
        </h2>
        <UFormField label="Name">
          <UInput
            v-model="templateForm.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Subject">
          <UInput
            v-model="templateForm.subject"
            class="w-full"
          />
        </UFormField>
        <UFormField label="HTML body">
          <UTextarea
            v-model="templateForm.bodyHtml"
            :rows="8"
            class="w-full font-mono text-xs"
          />
        </UFormField>
        <UButton
          :loading="creatingTemplate"
          @click="createTemplate"
        >
          Save template
        </UButton>
        <ul class="text-xs text-muted space-y-1">
          <li
            v-for="t in templates"
            :key="t.id"
          >
            {{ t.name }} · {{ t.subject }}
          </li>
        </ul>
      </div>

      <div class="rounded-lg border border-default bg-default p-4 space-y-3">
        <h2 class="font-medium text-highlighted">
          New campaign
        </h2>
        <UFormField label="Name">
          <UInput
            v-model="campaignForm.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Template">
          <select
            v-model="campaignForm.templateId"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="item in templateItems"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Congress">
          <select
            v-model="campaignForm.congressId"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="item in congressItems"
              :key="item.value || 'none'"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Engagement type">
          <select
            v-model="campaignForm.engagementType"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
          >
            <option
              v-for="item in engagementOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </UFormField>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="campaignForm.isContracted"
            type="checkbox"
            class="rounded border-default"
          >
          <span>Contracted engagement</span>
        </label>
        <UFormField label="KOLs (with email)">
          <div class="max-h-48 space-y-2 overflow-y-auto rounded-md border border-default p-3">
            <label
              v-for="kol in kolOptions"
              :key="kol.value"
              class="flex items-center gap-2 text-sm"
            >
              <input
                v-model="campaignForm.kolIds"
                type="checkbox"
                class="rounded border-default"
                :value="kol.value"
              >
              <span>{{ kol.label }}</span>
            </label>
            <p
              v-if="!kolOptions.length"
              class="text-xs text-muted"
            >
              Add KOLs with email addresses first.
            </p>
          </div>
        </UFormField>
        <UButton
          :loading="creatingCampaign"
          :disabled="!campaignForm.name || !campaignForm.templateId || !campaignForm.kolIds.length"
          @click="createCampaign"
        >
          Create campaign
        </UButton>
      </div>
    </div>

    <div class="rounded-lg border border-default bg-default">
      <div class="border-b border-default px-4 py-3 font-medium text-highlighted">
        Campaigns
      </div>
      <ul class="divide-y divide-default">
        <li
          v-for="campaign in campaigns"
          :key="campaign.id"
          class="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <button
            type="button"
            class="text-left"
            @click="openCampaign(campaign.id)"
          >
            <p class="font-medium text-highlighted">
              {{ campaign.name }}
            </p>
            <p class="text-xs text-muted">
              {{ campaign.status }} · {{ campaign.invitationCount || 0 }} invites
              · {{ campaign.engagementType.replace('_', ' ') }}
              <span v-if="campaign.isContracted"> · contracted</span>
              <span v-if="campaign.congress"> · {{ campaign.congress.name }}</span>
            </p>
          </button>
          <UButton
            size="sm"
            :loading="sendingId === campaign.id"
            @click="sendCampaign(campaign.id)"
          >
            Send
          </UButton>
        </li>
        <li
          v-if="!pending && !campaigns.length"
          class="px-4 py-6 text-sm text-muted"
        >
          No campaigns yet.
        </li>
      </ul>
    </div>

    <div
      v-if="selectedCampaign"
      class="rounded-lg border border-default bg-default p-4 space-y-3"
    >
      <h2 class="font-medium text-highlighted">
        {{ selectedCampaign.name }} invitations
      </h2>
      <ul class="divide-y divide-default text-sm">
        <li
          v-for="invite in selectedCampaign.invitations || []"
          :key="invite.id"
          class="py-2 flex flex-wrap justify-between gap-2"
        >
          <div>
            <p class="text-highlighted">
              {{ invite.toName }} · {{ invite.toEmail }}
            </p>
            <p class="text-xs text-muted">
              {{ invite.status }}
              <span v-if="invite.errorMessage"> · {{ invite.errorMessage }}</span>
            </p>
          </div>
          <code
            v-if="invite.responseToken"
            class="text-xs text-muted"
          >/rsvp/{{ invite.responseToken.slice(0, 8) }}…</code>
        </li>
      </ul>
    </div>
  </div>
</template>
