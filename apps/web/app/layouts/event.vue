<script setup lang="ts">
const route = useRoute()
const { user, logout } = useAuth()

const orgId = computed(() => {
  const value = route.params.orgId
  return typeof value === 'string' ? value : undefined
})

const congressId = computed(() => {
  const value = route.params.congressId
  return typeof value === 'string' ? value : undefined
})

const base = computed(() => {
  if (!orgId.value || !congressId.value) return null
  return `/event/${orgId.value}/c/${congressId.value}`
})

const tabs = computed(() => {
  if (!base.value) return []
  return [
    { label: 'Home', to: base.value, icon: 'i-lucide-house', exact: true },
    { label: 'Schedule', to: `${base.value}/calendar`, icon: 'i-lucide-calendar', exact: false },
    { label: 'Check-in', to: `${base.value}/check-in`, icon: 'i-lucide-qr-code', exact: false },
    { label: 'Info', to: `${base.value}/about`, icon: 'i-lucide-map', exact: false },
    { label: 'Safety', to: `${base.value}/safety`, icon: 'i-lucide-shield', exact: false }
  ]
})

function isActive(to: string, exact = false) {
  if (exact) return route.path === to
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function onLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-default flex flex-col">
    <header class="sticky top-0 z-20 border-b border-default bg-default/95 backdrop-blur px-4 py-3">
      <div class="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div class="min-w-0">
          <NuxtLink
            :to="orgId ? `/event/${orgId}` : '/event'"
            class="text-sm font-semibold text-highlighted tracking-tight"
          >
            Event App
          </NuxtLink>
          <p
            v-if="route.meta.title"
            class="truncate text-xs text-muted"
          >
            {{ route.meta.title }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            v-if="orgId"
            size="xs"
            color="neutral"
            variant="ghost"
            :to="`/app/${orgId}`"
          >
            Console
          </UButton>
          <UColorModeButton size="xs" />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            :aria-label="`Sign out ${user?.email || ''}`"
            @click="onLogout"
          />
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-24">
      <slot />
    </main>

    <nav
      v-if="tabs.length"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-default/95 backdrop-blur"
    >
      <div class="mx-auto flex max-w-lg items-stretch justify-between px-1">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px]"
          :class="isActive(tab.to, tab.exact)
            ? 'text-highlighted font-medium'
            : 'text-muted'"
        >
          <UIcon
            :name="tab.icon"
            class="size-5"
          />
          <span>{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
