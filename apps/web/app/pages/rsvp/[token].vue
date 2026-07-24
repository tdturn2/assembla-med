<script setup lang="ts">
import type { InvitationPublic } from '@assembla-med/shared'

definePageMeta({ layout: 'default' })

const route = useRoute()
const token = route.params.token as string
const config = useRuntimeConfig()
const pending = ref(false)
const message = ref('')
const error = ref('')
const done = ref(false)

type PublicInvitation = InvitationPublic & {
  bodyHtml?: string
  organizationName?: string
  congressName?: string | null
}

const { data, error: loadError } = await useAsyncData(`rsvp-${token}`, () =>
  $fetch<{ invitation: PublicInvitation }>(
    `/public/invitations/${token}`,
    { baseURL: config.public.apiBase as string }
  )
)

async function respond(response: 'accepted' | 'declined') {
  pending.value = true
  error.value = ''
  try {
    await $fetch(`/public/invitations/${token}/respond`, {
      baseURL: config.public.apiBase as string,
      method: 'POST',
      body: { response, message: message.value || undefined }
    })
    done.value = true
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Unable to submit response'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-16">
    <p class="text-sm text-muted">
      Assembla Med invitation
    </p>
    <div
      v-if="loadError"
      class="mt-4"
    >
      <UAlert
        color="error"
        title="Invitation not found"
      />
    </div>
    <div
      v-else-if="data"
      class="mt-4 space-y-4"
    >
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        {{ data.invitation.subject }}
      </h1>
      <p class="text-sm text-muted">
        From {{ data.invitation.organizationName || 'organization' }}
        <span v-if="data.invitation.congressName"> · {{ data.invitation.congressName }}</span>
      </p>
      <div
        class="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-default bg-default p-4"
        v-html="data.invitation.bodyHtml"
      />

      <UFormField label="Optional message">
        <UTextarea
          v-model="message"
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="String(error)"
      />
      <UAlert
        v-if="done"
        color="success"
        title="Thanks — your response was recorded."
      />

      <div
        v-if="!done"
        class="flex gap-2"
      >
        <UButton
          :loading="pending"
          @click="respond('accepted')"
        >
          Accept
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          :loading="pending"
          @click="respond('declined')"
        >
          Decline
        </UButton>
      </div>
    </div>
  </div>
</template>
