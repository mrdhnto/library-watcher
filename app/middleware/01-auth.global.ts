export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup', '/__nuxt_error']
  if (publicRoutes.includes(to.path)) return

  const auth = useAuth()
  const status = await auth.checkAuth()

  if (status === 'setup-needed') {
    return navigateTo('/setup')
  }

  if (status === 'unauthenticated') {
    return navigateTo('/login')
  }

  // Admin-only routes
  if (to.path.startsWith('/admin') || to.path === '/clients') {
    if (!auth.isAdmin.value) {
      return navigateTo('/')
    }
  }
})
