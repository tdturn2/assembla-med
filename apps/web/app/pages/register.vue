<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { register } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  pending.value = true
  try {
    await register(email.value, password.value)
    await navigateTo('/app')
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Unable to register'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
    <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
      Create account
    </h1>
    <p class="mt-2 text-muted text-sm">
      Start organizing congress engagement.
    </p>

    <UForm
      class="mt-8 space-y-4"
      @submit.prevent="onSubmit"
    >
      <UFormField label="Email">
        <UInput
          v-model="email"
          type="email"
          autocomplete="email"
          class="w-full"
          required
        />
      </UFormField>
      <UFormField label="Password (min 8 characters)">
        <UInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          class="w-full"
          minlength="8"
          required
        />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="String(error)"
      />

      <UButton
        type="submit"
        block
        :loading="pending"
      >
        Create account
      </UButton>
    </UForm>

    <p class="mt-6 text-sm text-muted">
      Already have an account?
      <NuxtLink
        to="/login"
        class="text-primary"
      >
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
