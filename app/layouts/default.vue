<script setup lang="ts">
const { currentUser, isAuthenticated, isAdmin, loading, logout } = useAuth()
const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)

const links = computed(() => [{
  label: 'Dashboard',
  icon: 'i-lucide-layout-dashboard',
  to: '/'
}, {
  label: 'Files',
  icon: 'i-lucide-files',
  to: '/files'
}, {
  label: 'Explorer',
  icon: 'i-lucide-folder-tree',
  to: '/explorer'
}, {
  label: 'Queue',
  icon: 'i-lucide-list-todo',
  to: '/queue'
}, {
  label: 'Scan',
  icon: 'i-lucide-search',
  to: '/scan'
}, {
  label: 'Clients',
  icon: 'i-lucide-monitor',
  to: '/clients'
}, {
  label: 'Admin',
  icon: 'i-lucide-shield',
  to: '/admin/users',
  badge: { color: 'warning' as const, variant: 'solid' as const, size: 'sm' as const, label: 'Admin' }
}])

const visibleLinks = computed(() => {
  if (!isAuthenticated.value) return []
  if (isAdmin.value) return links.value
  return links.value.filter(l => l.label !== 'Admin' && l.label !== 'Clients')
})

const mobileNavLinks = computed(() => {
  if (!isAuthenticated.value) return []
  const items = links.value.slice(0, 4)
  return items.filter((item) => {
    if (item.label === 'Clients' && !isAdmin.value) return false
    if (item.label === 'Admin' && !isAdmin.value) return false
    return true
  })
})

const isLoggingOut = ref(false)

async function handleLogout() {
  isLoggingOut.value = true
  await logout()
  isLoggingOut.value = false
  router.push('/login')
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

const userMenuItems = computed(() => [
  { type: 'label' as const, label: `Signed in as ${currentUser.value?.username}` },
  { type: 'separator' as const },
  { label: 'Account', icon: 'i-lucide-user', to: '/account' },
  { type: 'separator' as const },
  { label: 'Sign Out', icon: 'i-lucide-log-out', color: 'error' as const, onSelect: handleLogout }
])

watch(route, () => {
  mobileOpen.value = false
})
</script>

<template>
  <div>
    <UDashboardGroup
      storage="local"
      storage-key="lw-dashboard"
    >
      <UDashboardSidebar
        v-model:collapsed="collapsed"
        v-model:open="mobileOpen"
        collapsible
        resizable
        mode="slideover"
      >
        <template #header="{ collapsed: c }">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 font-bold"
            :class="c ? 'justify-center' : 'px-2'"
          >
            <UIcon
              name="i-lucide-library"
              class="w-6 h-6 text-primary shrink-0"
            />
            <span
              v-if="!c"
              class="text-lg"
            >Library Watcher</span>
          </NuxtLink>
        </template>

        <template #default="{ collapsed: c }">
          <UNavigationMenu
            v-if="!loading"
            :collapsed="c"
            :items="visibleLinks"
            orientation="vertical"
          />
          <div
            v-else
            class="space-y-1 px-2"
            :class="c ? 'flex flex-col items-center' : ''"
          >
            <USkeleton
              v-for="i in 4"
              :key="i"
              class="h-9 w-full"
            />
          </div>
        </template>

        <template #footer="{ collapsed: c }">
          <div
            class="flex items-center gap-1"
            :class="c ? 'flex-col' : 'px-1'"
          >
            <UDropdownMenu
              :items="userMenuItems"
              class="flex-1 min-w-0"
            >
              <UButton
                color="neutral"
                variant="ghost"
                class="flex items-center gap-2 w-full"
                :class="c ? 'justify-center' : 'justify-start'"
              >
                <UAvatar
                  :text="getInitial(currentUser?.username || '')"
                  size="sm"
                  class="cursor-pointer shrink-0"
                />
                <span
                  v-if="!c"
                  class="text-sm font-medium truncate"
                >{{ currentUser?.username }}</span>
              </UButton>
            </UDropdownMenu>
            <UColorModeButton />
          </div>
        </template>
      </UDashboardSidebar>

      <slot />
    </UDashboardGroup>

    <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-elevated lg:hidden safe-area-bottom">
      <div class="flex items-center justify-around h-14">
        <NuxtLink
          v-for="item in mobileNavLinks"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors"
          :class="route.path === item.to ? 'text-primary' : 'text-muted'"
        >
          <UIcon
            :name="item.icon"
            class="w-5 h-5"
          />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
