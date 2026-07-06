import { computed } from 'vue'

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

export function useAuth() {
  const currentUser = useState<User | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isAuthenticated = computed(() => currentUser.value !== null)

  async function checkAuth(): Promise<'authenticated' | 'setup-needed' | 'unauthenticated'> {
    if (currentUser.value) {
      loading.value = false
      return 'authenticated'
    }
    loading.value = true
    try {
      const status = await $fetch<{ setupNeeded: boolean }>('/api/auth/status')
      if (status.setupNeeded) {
        loading.value = false
        return 'setup-needed'
      }

      const user = await $fetch<User>('/api/auth/me')
      currentUser.value = user
      loading.value = false
      return 'authenticated'
    } catch {
      currentUser.value = null
      loading.value = false
      return 'unauthenticated'
    }
  }

  async function login(username: string, password: string): Promise<User> {
    const data = await $fetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    currentUser.value = data.user
    return data.user
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    currentUser.value = null
  }

  async function setup(username: string, password: string, passwordHint: string): Promise<void> {
    await $fetch('/api/auth/setup', {
      method: 'POST',
      body: { username, password, passwordHint }
    })
  }

  return {
    currentUser,
    loading,
    isAdmin,
    isAuthenticated,
    checkAuth,
    login,
    logout,
    setup
  }
}
