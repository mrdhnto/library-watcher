<script setup lang="ts">
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
    fetchClients()
  } catch (err) {
    console.error('Failed to rename client:', err)
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
    fetchClients()
  } catch (err) {
    console.error('Failed to kick client:', err)
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
    fetchTokens()
  } catch (err) {
    console.error('Failed to generate token:', err)
  } finally {
    generatingToken.value = false
  }
}

const copyToken = async (token: string) => {
  try {
    await navigator.clipboard.writeText(token)
  } catch {
    // Fallback
  }
}

const revokeToken = async (id: number) => {
  try {
    await $fetch(`/api/clients/tokens/${id}`, { method: 'DELETE' })
    fetchTokens()
  } catch (err) {
    console.error('Failed to revoke token:', err)
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

onMounted(() => {
  fetchClients()
  fetchTokens()
})
</script>

<template>
  <UContainer class="py-8 space-y-8">
    <div>
      <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
        Remote Clients
      </h1>
      <p class="text-gray-500">
        Manage connected remote scanning clients and authentication tokens
      </p>
    </div>

    <!-- Connected Clients -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
              <UIcon name="i-lucide-monitor" class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Connected Clients</h2>
              <p class="text-sm text-gray-500">
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
        class="text-center py-12 text-gray-500"
      >
        <UIcon name="i-lucide-wifi-off" class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No clients registered yet.</p>
        <p class="text-sm">Generate a token below and connect using <code class="text-primary">lw-client</code>.</p>
      </div>

      <UTable
        v-else
        :data="clients"
        :loading="loading"
        :columns="[
          { accessorKey: 'name', header: 'Alias' },
          { accessorKey: 'hostname', header: 'Hostname' },
          { accessorKey: 'ip_address', header: 'IP Address' },
          { accessorKey: 'status', header: 'Status' },
          { accessorKey: 'last_heartbeat', header: 'Last Heartbeat' },
          { accessorKey: 'connected_at', header: 'Connected Since' },
          { accessorKey: 'actions', header: '', id: 'actions' }
        ]"
      >
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.name }}</span>
        </template>

        <template #hostname-cell="{ row }">
          <span class="text-sm text-gray-500">{{ row.original.hostname }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)" variant="soft" size="sm">
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #last_heartbeat-cell="{ row }">
          <span class="text-sm text-gray-500">
            {{ row.original.last_heartbeat ? new Date(row.original.last_heartbeat).toLocaleString() : '-' }}
          </span>
        </template>

        <template #connected_at-cell="{ row }">
          <span class="text-sm text-gray-500">
            {{ new Date(row.original.connected_at).toLocaleString() }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2 justify-end">
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
    </UCard>

    <!-- Auth Tokens -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
              <UIcon name="i-lucide-key-round" class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Authentication Tokens</h2>
              <p class="text-sm text-gray-500">
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
        class="text-center py-8 text-gray-500"
      >
        <p>No tokens generated yet.</p>
      </div>

      <UTable
        v-else
        :data="tokens"
        :loading="tokenLoading"
        :columns="[
          { accessorKey: 'token', header: 'Token' },
          { accessorKey: 'label', header: 'Label' },
          { accessorKey: 'claimed_by', header: 'Claimed By' },
          { accessorKey: 'is_active', header: 'Status' },
          { accessorKey: 'created_at', header: 'Created' },
          { accessorKey: 'actions', header: '', id: 'actions' }
        ]"
      >
        <template #token-cell="{ row }">
          <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded select-all font-mono">
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

        <template #claimed_by-cell="{ row }">
          <span v-if="row.original.claimed_by" class="text-sm font-medium">{{ row.original.claimed_by }}</span>
          <UBadge v-else color="warning" variant="soft" size="sm">Unclaimed</UBadge>
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
          <span class="text-sm text-gray-500">
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
    </UCard>

    <!-- Rename Modal -->
    <UModal v-model:open="renameModalOpen">
      <template #header>
        <h3 class="font-bold text-lg">
          Rename Client
        </h3>
      </template>
      <template #body>
        <UFormField label="New Name">
          <UInput
            v-model="renameValue"
            placeholder="Enter new client name"
            @keydown.enter="doRename"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="renameModalOpen = false">
            Cancel
          </UButton>
          <UButton
            color="primary"
            :loading="renameLoading"
            @click="doRename"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Kick Confirmation Modal -->
    <UModal v-model:open="kickConfirmOpen">
      <template #header>
        <h3 class="font-bold text-lg text-error">
          Kick Client
        </h3>
      </template>
      <template #body>
        <p>
          Are you sure you want to disconnect
          <strong>{{ kickTarget?.name }}</strong>?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          The client will be disconnected and marked as kicked. It can reconnect with a valid token.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="kickConfirmOpen = false">
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="kickLoading"
            @click="doKick"
          >
            Kick Client
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Generate Token Modal -->
    <UModal v-model:open="newTokenModalOpen">
      <template #header>
        <h3 class="font-bold text-lg">
          Generate Token
        </h3>
      </template>
      <template #body>
        <div v-if="!newTokenResult" class="space-y-4">
          <UFormField label="Label (optional)">
            <UInput
              v-model="newTokenLabel"
              placeholder="e.g. Living Room PC"
            />
          </UFormField>
          <UButton
            color="primary"
            :loading="generatingToken"
            @click="doGenerateToken"
          >
            Generate
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <p class="text-sm text-gray-500">
            Copy this token and use it with the client:
          </p>
          <div class="flex items-center gap-2">
            <code class="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm break-all select-all">
              {{ newTokenResult.token }}
            </code>
            <UButton
              color="primary"
              variant="soft"
              size="sm"
              icon="i-lucide-copy"
              @click="copyToken(newTokenResult.token)"
            />
          </div>
          <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-800 dark:text-blue-300">
            <p class="font-semibold mb-1">Usage (first time)</p>
            <code class="text-xs break-all">lw-client -u ws://your-server:8080/api/client/ws -t {{ newTokenResult.token }}</code>
            <p class="mt-2 font-semibold">Reconnect later</p>
            <code class="text-xs">lw-client connect</code>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            @click="newTokenModalOpen = false"
          >
            {{ newTokenResult ? 'Done' : 'Cancel' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
