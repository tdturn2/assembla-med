<template>
  <div class="min-h-screen bg-default">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="font-semibold text-highlighted tracking-tight"
        >
          Assembla Med
        </NuxtLink>
      </template>
      <template #right>
        <UColorModeButton />
        <UButton
          to="/login"
          color="neutral"
          variant="ghost"
        >
          Sign in
        </UButton>
        <UButton to="/register">
          Create account
        </UButton>
      </template>
    </UHeader>
    <UMain>
      <slot />
    </UMain>
  </div>
</template>
