<script setup lang="ts">
const toast = useToast()
const { isAdmin } = useAuth()
const clients = ref<any[]>([])
const tokens = ref<any[]>([])
const loading = ref(false)
const tokenLoading = ref(false)

const renameModalOpen = ref(false)
const renameTarget = ref<any>(null)
const renameValue = ref('')
const renameLoading = ref(false)

const newTokenLabel = ref('')
const newTokenModalOpen = ref(false)
const newTokenResult = ref<any>(null)
const generatingToken = ref(false)

const kickConfirmOpen = ref(false)
const kickTarget = ref<any>(null)
const kickLoading = ref(false)

const fetchClients = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/clients')
    if (data) clients.value = data as any[]
  } catch (err) {
    console.error('Failed to fetch clients:', err)
  } finally {
    loading.value = false
  }
}

const fetchTokens = async () => {
  tokenLoading.value = true
  try {
    const data = await $fetch('/api/clients/tokens')
    if (data) tokens.value = data as any[]
  } catch (err) {
    console.error('Failed to fetch tokens:', err)
  } finally {
    tokenLoading.value = false
  }
}

const openRename = (client: any) => {
  renameTarget.value = client
  renameValue.value = client.name
  renameModalOpen.value = true
}

const doRename = async () => {
  if (!renameTarget.value || !renameValue.value.trim()) return
  renameLoading.value = true
  try {
    await $fetch(`/api/clients/${renameTarget.value.client_id}/rename`, {
      method: 'POST',
      body: { name: renameValue.value.trim() }
    })
    renameModalOpen.value = false
    toast.add({ title: 'Client renamed successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchClients()
  } catch (err) {
    toast.add({ title: 'Failed to rename client', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    renameLoading.value = false
  }
}

const confirmKick = (client: any) => {
  kickTarget.value = client
  kickConfirmOpen.value = true
}

const doKick = async () => {
  if (!kickTarget.value) return
  kickLoading.value = true
  try {
    await $fetch(`/api/clients/${kickTarget.value.client_id}/kick`, {
      method: 'POST'
    })
    kickConfirmOpen.value = false
    toast.add({ title: 'Client kicked successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchClients()
  } catch (err) {
    toast.add({ title: 'Failed to kick client', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    kickLoading.value = false
  }
}

const openNewToken = () => {
  newTokenLabel.value = ''
  newTokenResult.value = null
  newTokenModalOpen.value = true
}

const doGenerateToken = async () => {
  generatingToken.value = true
  try {
    const data = await $fetch('/api/clients/tokens', {
      method: 'POST',
      body: { label: newTokenLabel.value }
    })
    newTokenResult.value = data
    toast.add({ title: 'Token generated successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchTokens()
  } catch (err) {
    toast.add({ title: 'Failed to generate token', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    generatingToken.value = false
  }
}

const copyToken = async (token: string) => {
  try {
    await navigator.clipboard.writeText(token)
    toast.add({ title: 'Token copied to clipboard', color: 'success', icon: 'i-lucide-check-circle' })
  } catch {
    toast.add({ title: 'Failed to copy token', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

const revokeToken = async (id: number) => {
  try {
    await $fetch(`/api/clients/tokens/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Token revoked', color: 'success', icon: 'i-lucide-check-circle' })
    fetchTokens()
  } catch (err) {
    toast.add({ title: 'Failed to revoke token', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return 'success'
    case 'disconnected': return 'neutral'
    case 'kicked': return 'error'
    default: return 'neutral'
  }
}

const users = ref<any[]>([])

const fetchUsers = async () => {
  try {
    const data = await $fetch('/api/admin/users')
    if (data) users.value = data as any[]
  } catch {}
}

const promoteModalOpen = ref(false)
const promoteTarget = ref<any>(null)
const promoteUsername = ref('')
const promotePassword = ref('')
const promoteLoading = ref(false)
const promoteError = ref('')

const openPromote = (client: any) => {
  promoteTarget.value = client
  promoteUsername.value = ''
  promotePassword.value = ''
  promoteError.value = ''
  promoteModalOpen.value = true
}

const doPromote = async () => {
  promoteError.value = ''
  if (!promoteUsername.value || !promotePassword.value || promotePassword.value.length < 6) {
    promoteError.value = 'Username and password (min 6 chars) required'
    return
  }
  promoteLoading.value = true
  try {
    await $fetch(`/api/admin/users/${promoteTarget.value.user_id}/promote`, {
      method: 'POST',
      body: { username: promoteUsername.value, password: promotePassword.value }
    })
    promoteModalOpen.value = false
    toast.add({ title: 'User promoted successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchClients()
  } catch (err: any) {
    promoteError.value = err.data?.statusMessage || err.message || 'Failed to promote user'
  } finally {
    promoteLoading.value = false
  }
}

const rebindModalOpen = ref(false)
const rebindTarget = ref<any>(null)
const rebindUserId = ref<number | null>(null)
const rebindLoading = ref(false)
const rebindError = ref('')

const openRebind = (client: any) => {
  rebindTarget.value = client
  rebindUserId.value = null
  rebindError.value = ''
  rebindModalOpen.value = true
  fetchUsers()
}

const doRebind = async () => {
  rebindError.value = ''
  rebindLoading.value = true
  try {
    await $fetch(`/api/admin/clients/${rebindTarget.value.client_id}/rebind`, {
      method: 'POST',
      body: { userId: rebindUserId.value }
    })
    rebindModalOpen.value = false
    toast.add({ title: 'Client rebound successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchClients()
  } catch (err: any) {
    rebindError.value = err.data?.statusMessage || err.message || 'Failed to rebind client'
  } finally {
    rebindLoading.value = false
  }
}

onMounted(() => {
  fetchClients()
  fetchTokens()
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Remote Clients">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-8">
        <!-- Connected Clients -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg text-primary">
                  <UIcon
                    name="i-lucide-monitor"
                    class="w-5 h-5"
                  />
                </div>
                <div>
                  <h2 class="text-lg font-semibold">
                    Connected Clients
                  </h2>
                  <p class="text-sm text-muted">
                    Clients authenticated and ready for remote scanning
                  </p>
                </div>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-refresh-cw"
                :loading="loading"
                @click="fetchClients"
              />
            </div>
          </template>

          <div
            v-if="clients.length === 0 && !loading"
            class="text-center py-12 text-muted"
          >
            <UIcon
              name="i-lucide-wifi-off"
              class="w-12 h-12 mx-auto mb-4 opacity-50"
            />
            <p>No clients registered yet.</p>
            <p class="text-sm">
              Generate a token below and connect using <code class="text-primary">lw-client</code>.
            </p>
          </div>

          <div
            v-else
            class="overflow-x-auto"
          >
            <UTable
              v-if="clients.length > 0"
              :data="clients"
              :loading="loading"
              :columns="[
                { accessorKey: 'name', header: 'Alias' },
                { accessorKey: 'hostname', header: 'Hostname' },
                { accessorKey: 'ip_address', header: 'IP Address' },
                { accessorKey: 'status', header: 'Status' },
                { accessorKey: 'user_name', header: 'Bound User' },
                { accessorKey: 'last_heartbeat', header: 'Last Heartbeat' },
                { accessorKey: 'connected_at', header: 'Connected Since' },
                { accessorKey: 'actions', header: '', id: 'actions' }
              ]"
              class="min-w-[900px]"
            >
              <template #name-cell="{ row }">
                <span class="font-medium">{{ row.original.name }}</span>
              </template>

              <template #hostname-cell="{ row }">
                <span class="text-sm text-muted">{{ row.original.hostname }}</span>
              </template>

              <template #status-cell="{ row }">
                <UBadge
                  :color="getStatusColor(row.original.status)"
                  variant="soft"
                  size="sm"
                >
                  {{ row.original.status }}
                </UBadge>
              </template>

              <template #user_name-cell="{ row }">
                <div class="flex items-center gap-1">
                  <span
                    v-if="row.original.user_name"
                    class="text-sm font-medium"
                  >{{ row.original.user_name }}</span>
                  <span
                    v-else
                    class="text-sm text-dimmed italic"
                  >Unbound</span>
                  <UButton
                    v-if="isAdmin && row.original.user_name"
                    color="warning"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-star"
                    @click="openPromote(row.original)"
                  >
                    Promote
                  </UButton>
                </div>
              </template>

              <template #last_heartbeat-cell="{ row }">
                <span class="text-sm text-muted">
                  {{ row.original.last_heartbeat ? new Date(row.original.last_heartbeat).toLocaleString() : '-' }}
                </span>
              </template>

              <template #connected_at-cell="{ row }">
                <span class="text-sm text-muted">
                  {{ new Date(row.original.connected_at).toLocaleString() }}
                </span>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex items-center gap-2 justify-end">
                  <UButton
                    v-if="isAdmin"
                    color="info"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-link"
                    @click="openRebind(row.original)"
                  >
                    Rebind
                  </UButton>
                  <UButton
                    v-if="row.original.status === 'connected'"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-pencil"
                    @click="openRename(row.original)"
                  >
                    Rename
                  </UButton>
                  <UButton
                    v-if="row.original.status === 'connected'"
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-log-out"
                    @click="confirmKick(row.original)"
                  >
                    Kick
                  </UButton>
                </div>
              </template>
            </UTable>
          </div>
        </UCard>

        <!-- Auth Tokens -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg text-primary">
                  <UIcon
                    name="i-lucide-key-round"
                    class="w-5 h-5"
                  />
                </div>
                <div>
                  <h2 class="text-lg font-semibold">
                    Authentication Tokens
                  </h2>
                  <p class="text-sm text-muted">
                    Tokens used by clients to authenticate with this server
                  </p>
                </div>
              </div>
              <UButton
                color="primary"
                size="sm"
                icon="i-lucide-plus"
                @click="openNewToken"
              >
                Generate Token
              </UButton>
            </div>
          </template>

          <div
            v-if="tokens.length === 0 && !tokenLoading"
            class="text-center py-8 text-muted"
          >
            <p>No tokens generated yet.</p>
          </div>

          <div
            v-else
            class="overflow-x-auto"
          >
            <UTable
              v-if="tokens.length > 0"
              :data="tokens"
              :loading="tokenLoading"
              :columns="[
                { accessorKey: 'token', header: 'Token' },
                { accessorKey: 'label', header: 'Label' },
                { accessorKey: 'user_name', header: 'Bound User' },
                { accessorKey: 'claimed_by', header: 'Claimed By' },
                { accessorKey: 'is_active', header: 'Status' },
                { accessorKey: 'created_at', header: 'Created' },
                { accessorKey: 'actions', header: '', id: 'actions' }
              ]"
              class="min-w-[800px]"
            >
              <template #token-cell="{ row }">
                <code class="text-xs bg-muted px-2 py-1 rounded select-all font-mono">
                  {{ row.original.token.substring(0, 24) }}...
                </code>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-copy"
                  @click="copyToken(row.original.token)"
                />
              </template>

              <template #user_name-cell="{ row }">
                <span
                  v-if="row.original.user_name"
                  class="text-sm font-medium"
                >{{ row.original.user_name }}</span>
                <span
                  v-else
                  class="text-sm text-dimmed italic"
                >Unbound</span>
              </template>

              <template #claimed_by-cell="{ row }">
                <span
                  v-if="row.original.claimed_by"
                  class="text-sm text-muted"
                >{{ row.original.claimed_by }}</span>
                <UBadge
                  v-else
                  color="warning"
                  variant="soft"
                  size="sm"
                >
                  Unclaimed
                </UBadge>
              </template>

              <template #is_active-cell="{ row }">
                <UBadge
                  :color="row.original.is_active ? 'success' : 'neutral'"
                  variant="soft"
                  size="sm"
                >
                  {{ row.original.is_active ? 'Active' : 'Revoked' }}
                </UBadge>
              </template>

              <template #created_at-cell="{ row }">
                <span class="text-sm text-muted">
                  {{ new Date(row.original.created_at).toLocaleString() }}
                </span>
              </template>

              <template #actions-cell="{ row }">
                <UButton
                  v-if="row.original.is_active"
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-ban"
                  @click="revokeToken(row.original.id)"
                >
                  Revoke
                </UButton>
              </template>
            </UTable>
          </div>
        </UCard>

        <!-- Rename Modal -->
        <UModal v-model:open="renameModalOpen">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
              <div class="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-default/50">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-primary/20">
                      <UIcon name="i-lucide-pencil" class="w-5 h-5" />
                    </div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Rename Client</h3>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="renameModalOpen = false" />
                </div>
                
                <div class="p-6">
                  <UFormField label="New Name" required>
                    <UInput v-model="renameValue" placeholder="Enter new client name" icon="i-lucide-type" size="lg" class="w-full transition-all duration-300 hover:ring-primary/50 focus:ring-primary" @keydown.enter="doRename" />
                  </UFormField>
                </div>
                
                <div class="flex justify-end gap-3 p-6 pt-4 border-t border-default/50 bg-muted/10">
                  <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="renameModalOpen = false">Cancel</UButton>
                  <UButton color="primary" class="px-5 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95" :loading="renameLoading" @click="doRename">Save</UButton>
                </div>
              </div>
            </div>
          </template>
        </UModal>

        <!-- Kick Confirmation Modal -->
        <UModal v-model:open="kickConfirmOpen">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-error/20 rounded-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
              <div class="absolute -top-1/2 -right-1/4 w-full h-full bg-error/10 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-error/10">
                  <div class="flex items-center gap-3 text-error">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-error/10 border border-error/20">
                      <UIcon name="i-lucide-user-x" class="w-5 h-5 animate-pulse" />
                    </div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Kick Client</h3>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-error/10 hover:text-error transition-colors" @click="kickConfirmOpen = false" />
                </div>
                
                <div class="p-6 text-center">
                  <p class="text-lg">Are you sure you want to disconnect <strong class="text-error font-bold">{{ kickTarget?.name }}</strong>?</p>
                  <p class="text-sm text-muted mt-2">The client will be disconnected and marked as kicked. It can reconnect with a valid token.</p>
                </div>
                
                <div class="flex justify-end gap-3 p-6 pt-4 border-t border-error/10 bg-error/5">
                  <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="kickConfirmOpen = false">Cancel</UButton>
                  <UButton color="error" class="px-5 shadow-lg shadow-error/30 transition-transform hover:scale-105 active:scale-95" :loading="kickLoading" @click="doKick">Kick Client</UButton>
                </div>
              </div>
            </div>
          </template>
        </UModal>

        <!-- Generate Token Modal -->
        <UModal v-model:open="newTokenModalOpen" :ui="{ content: 'sm:max-w-md' }">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
              <div class="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-default/50">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-primary/20">
                      <UIcon name="i-lucide-key" class="w-5 h-5" />
                    </div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Generate Token</h3>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="newTokenModalOpen = false" />
                </div>
                
                <div class="p-6">
                  <div v-if="!newTokenResult" class="space-y-5">
                    <UFormField label="Label (optional)">
                      <UInput v-model="newTokenLabel" placeholder="e.g. Living Room PC" icon="i-lucide-tag" size="lg" class="w-full transition-all duration-300 hover:ring-primary/50 focus:ring-primary" />
                    </UFormField>
                  </div>
                  <div v-else class="space-y-4">
                    <p class="text-sm font-medium text-muted">Copy this token and use it with the client:</p>
                    <div class="flex items-center gap-2 p-1 bg-muted/50 border border-default/50 rounded-xl">
                      <code class="flex-1 px-3 py-2 text-primary font-mono font-bold text-sm break-all select-all">{{ newTokenResult.token }}</code>
                      <UButton color="primary" variant="soft" class="shrink-0 rounded-lg transition-transform hover:scale-105 active:scale-95 mr-1" icon="i-lucide-copy" @click="copyToken(newTokenResult.token)">Copy</UButton>
                    </div>
                    <div class="bg-info/10 border border-info/20 p-4 rounded-xl text-sm text-info shadow-inner">
                      <p class="font-bold mb-1 flex items-center gap-2"><UIcon name="i-lucide-play-circle" class="w-4 h-4" /> Usage (first time)</p>
                      <code class="text-xs break-all block mb-3 opacity-90">lw-client -u ws://your-server:8080/api/client/ws -t {{ newTokenResult.token }}</code>
                      <p class="font-bold mb-1 flex items-center gap-2"><UIcon name="i-lucide-refresh-cw" class="w-4 h-4" /> Reconnect later</p>
                      <code class="text-xs opacity-90">lw-client connect</code>
                    </div>
                  </div>
                </div>
                
                <div class="flex justify-end p-6 pt-4 border-t border-default/50 bg-muted/10">
                  <UButton v-if="!newTokenResult" color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95 mr-3" @click="newTokenModalOpen = false">Cancel</UButton>
                  <UButton v-if="!newTokenResult" color="primary" class="px-6 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95" :loading="generatingToken" @click="doGenerateToken">Generate</UButton>
                  <UButton v-else color="primary" class="px-8 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95" @click="newTokenModalOpen = false">Done</UButton>
                </div>
              </div>
            </div>
          </template>
        </UModal>

        <!-- Promote Temp User Modal -->
        <UModal v-model:open="promoteModalOpen">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-warning/20 rounded-xl shadow-2xl">
              <div class="absolute -top-20 -left-20 w-64 h-64 bg-warning/20 rounded-full blur-3xl pointer-events-none" />
              <div class="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-warning/20">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 text-warning shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-warning/20">
                      <UIcon name="i-lucide-star" class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-bold text-lg leading-tight tracking-tight text-warning-500">Promote Temp User</h3>
                      <p class="text-xs text-muted font-medium">Convert <span class="text-warning">{{ promoteTarget?.user_name }}</span> to permanent</p>
                    </div>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-warning/10 transition-colors" @click="promoteModalOpen = false" />
                </div>
                
                <div class="p-6">
                  <UAlert v-if="promoteError" color="error" variant="soft" :title="promoteError" class="mb-5 shadow-inner" />
                  <form class="space-y-5" @submit.prevent="doPromote">
                    <UFormField label="New Username" required>
                      <UInput v-model="promoteUsername" placeholder="Choose a username" icon="i-lucide-user" size="lg" class="w-full transition-all duration-300 hover:ring-warning/50 focus:ring-warning" />
                    </UFormField>
                    <UFormField label="Password" required>
                      <UInput v-model="promotePassword" type="password" placeholder="At least 6 characters" icon="i-lucide-lock" size="lg" class="w-full transition-all duration-300 hover:ring-warning/50 focus:ring-warning" />
                    </UFormField>
                  </form>
                </div>
                
                <div class="flex justify-end gap-3 p-6 pt-4 border-t border-warning/20 bg-warning/5">
                  <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="promoteModalOpen = false">Cancel</UButton>
                  <UButton color="warning" class="px-5 shadow-lg shadow-warning/30 transition-transform hover:scale-105 active:scale-95" :loading="promoteLoading" @click="doPromote">Promote to Permanent</UButton>
                </div>
              </div>
            </div>
          </template>
        </UModal>

        <!-- Rebind Client Modal -->
        <UModal v-model:open="rebindModalOpen">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
              <div class="absolute -top-32 -left-32 w-64 h-64 bg-info/20 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-default/50">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-info/20 to-info/5 text-info shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-info/20">
                      <UIcon name="i-lucide-link" class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-bold text-lg leading-tight tracking-tight">Rebind Client</h3>
                      <p class="text-xs text-muted font-medium">Re-assign <strong>{{ rebindTarget?.name }}</strong> to a user</p>
                    </div>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="rebindModalOpen = false" />
                </div>
                
                <div class="p-6">
                  <UAlert v-if="rebindError" color="error" variant="soft" :title="rebindError" class="mb-5 shadow-inner" />
                  
                  <UFormField label="Select User">
                    <USelect v-model="rebindUserId" :items="[{ label: '— Unbind (No User) —', value: null }, ...users.map(u => ({ label: `${u.username}${u.is_temp ? ' (temp)' : ''}`, value: u.id }))]" placeholder="Select a user" size="lg" class="w-full" icon="i-lucide-user" />
                  </UFormField>
                </div>
                
                <div class="flex justify-end gap-3 p-6 pt-4 border-t border-default/50 bg-muted/10">
                  <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="rebindModalOpen = false">Cancel</UButton>
                  <UButton :color="rebindUserId ? 'info' : 'warning'" class="px-5 shadow-lg transition-transform hover:scale-105 active:scale-95" :class="rebindUserId ? 'shadow-info/30' : 'shadow-warning/30'" :loading="rebindLoading" @click="doRebind">{{ rebindUserId ? 'Bind Client' : 'Unbind Client' }}</UButton>
                </div>
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
