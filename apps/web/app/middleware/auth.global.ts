export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, loaded, refreshMe } = useAuth()

  if (!loaded.value) {
    await refreshMe()
  }

  const needsAuth = to.path.startsWith('/app') || to.path.startsWith('/event')
  if (!isAuthenticated.value && needsAuth) {
    return navigateTo('/login')
  }

  if (isAuthenticated.value && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/app')
  }
})
