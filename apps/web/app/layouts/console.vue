<script setup lang="ts">
const route = useRoute()
const { user, logout } = useAuth()

const orgId = computed(() => {
  const value = route.params.orgId
  return typeof value === 'string' ? value : undefined
})

const links = computed(() => {
  if (!orgId.value) {
    return [{
      label: 'Organizations',
      to: '/app',
      icon: 'i-lucide-building-2',
      exact: true
    }]
  }

  const base = `/app/${orgId.value}`
  return [
    { label: 'Congresses', to: base, icon: 'i-lucide-calendar-days', exact: true },
    { label: 'KOLs', to: `${base}/kols`, icon: 'i-lucide-users', exact: false },
    { label: 'Engagements', to: `${base}/engagements`, icon: 'i-lucide-handshake', exact: false },
    { label: 'Check-in', to: `${base}/check-in`, icon: 'i-lucide-qr-code', exact: false }
  ]
})

function isActive(to: string, exact = false) {
  if (exact) {
    return route.path === to
  }
  if (to.endsWith('/engagements')) {
    return (
      route.path === to
      || route.path.startsWith(`${to}/`)
      || route.path.includes('/appointments')
      || route.path.includes('/outreach')
    )
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function onLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <div class="flex min-h-screen">
      <aside class="hidden w-60 shrink-0 border-r border-default bg-elevated/30 md:flex md:flex-col">
        <div class="border-b border-default px-4 py-4">
          <NuxtLink
            to="/app"
            class="font-semibold text-highlighted tracking-tight"
          >
            Assembla Med
          </NuxtLink>
        </div>
        <nav class="flex flex-1 flex-col gap-1 p-3">
          <NuxtLink
            v-for="item in links"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors"
            :class="isActive(item.to, item.exact)
              ? 'bg-elevated text-highlighted font-medium'
              : 'text-muted hover:bg-elevated/70 hover:text-highlighted'"
          >
            <UIcon
              :name="item.icon"
              class="size-4 shrink-0"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
        <div class="border-t border-default p-3 space-y-2">
          <UButton
            v-if="orgId"
            color="neutral"
            variant="soft"
            icon="i-lucide-smartphone"
            block
            :to="`/event/${orgId}`"
          >
            Event App
          </UButton>
          <p class="truncate px-2 text-xs text-muted">
            {{ user?.email }}
          </p>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            block
            @click="onLogout"
          >
            Sign out
          </UButton>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-between gap-3 border-b border-default px-4 py-3 md:px-6">
          <div class="flex items-center gap-3">
            <NuxtLink
              to="/app"
              class="font-semibold text-highlighted md:hidden"
            >
              AM
            </NuxtLink>
            <h1 class="text-sm font-medium text-highlighted">
              {{ route.meta.title || 'Console' }}
            </h1>
          </div>
          <div class="flex items-center gap-2">
            <UColorModeButton />
            <UButton
              class="md:hidden"
              color="neutral"
              variant="ghost"
              icon="i-lucide-log-out"
              @click="onLogout"
            />
          </div>
        </header>

        <nav class="flex gap-1 overflow-x-auto border-b border-default px-3 py-2 md:hidden">
          <NuxtLink
            v-for="item in links"
            :key="`m-${item.to}`"
            :to="item.to"
            class="rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap"
            :class="isActive(item.to, item.exact)
              ? 'bg-elevated text-highlighted font-medium'
              : 'text-muted'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <main class="flex-1 p-4 md:p-6">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
