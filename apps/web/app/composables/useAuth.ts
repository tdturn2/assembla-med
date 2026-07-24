import type { MeResponse, OrganizationPublic, UserPublic } from '@assembla-med/shared'

export function useAuth() {
  const { api } = useApi()
  const user = useState<UserPublic | null>('auth-user', () => null)
  const memberships = useState<MeResponse['memberships']>('auth-memberships', () => [])
  const loaded = useState('auth-loaded', () => false)

  const isAuthenticated = computed(() => !!user.value)

  async function refreshMe() {
    try {
      const me = await api<MeResponse>('/auth/me')
      user.value = me.user
      memberships.value = me.memberships
      return me
    } catch {
      user.value = null
      memberships.value = []
      return null
    } finally {
      loaded.value = true
    }
  }

  async function login(email: string, password: string) {
    await api<{ user: UserPublic }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    return refreshMe()
  }

  async function register(email: string, password: string) {
    await api<{ user: UserPublic }>('/auth/register', {
      method: 'POST',
      body: { email, password }
    })
    return refreshMe()
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      memberships.value = []
    }
  }

  async function createOrganization(name: string) {
    const result = await api<{ organization: OrganizationPublic }>('/organizations', {
      method: 'POST',
      body: { name }
    })
    await refreshMe()
    return result.organization
  }

  return {
    user,
    memberships,
    loaded,
    isAuthenticated,
    refreshMe,
    login,
    register,
    logout,
    createOrganization
  }
}
