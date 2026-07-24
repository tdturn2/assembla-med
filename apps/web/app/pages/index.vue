<script setup lang="ts">
const { isAuthenticated, refreshMe } = useAuth()

await refreshMe()
await navigateTo(isAuthenticated.value ? '/app' : '/login')
</script>

<template>
  <div class="p-8 text-muted">
    Loading…
  </div>
</template>
