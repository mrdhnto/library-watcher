<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const toast = useToast()
const { isAdmin } = useAuth()
const targetDir = ref('')
const isSync = ref(false)
const levelOneOnly = ref(false)
const isDispatching = ref(false)

const scanMode = ref<'local' | 'remote'>('local')
const clients = ref<any[]>([])
const selectedClientId = ref('')
const loadingClients = ref(false)

const connectedClients = computed(() =>
  clients.value.filter(c => c.status === 'connected')
)

const scanModes = computed(() => {
  const modes: { value: string, label: string, description: string }[] = []
  if (isAdmin.value) {
    modes.push({ value: 'local', label: 'Local Server', description: 'Scan a folder on this server' })
  }
  if (connectedClients.value.length > 0) {
    modes.push({ value: 'remote', label: 'Remote Client', description: 'Scan via a connected client machine' })
  }
  return modes
})

const fetchClients = async () => {
  loadingClients.value = true
  try {
    const data = await $fetch('/api/clients/accessible')
    if (data) clients.value = data as any[]
    if (!isAdmin.value && connectedClients.value.length > 0) {
      scanMode.value = 'remote'
    }
  } catch {
    //
  } finally {
    loadingClients.value = false
  }
}

onMounted(fetchClients)

const startScanJob = async () => {
  if (!targetDir.value) {
    toast.add({ title: 'Please enter a target directory path', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }

  if (scanMode.value === 'remote' && !selectedClientId.value) {
    toast.add({ title: 'Please select a remote client', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }

  isDispatching.value = true

  try {
    const response = await $fetch('/api/scan', {
      method: 'POST',
      body: {
        path: targetDir.value,
        isSync: isSync.value,
        levelOneOnly: levelOneOnly.value,
        clientId: scanMode.value === 'remote' ? selectedClientId.value : undefined
      }
    })

    if (response) {
      toast.add({ title: 'Scan job started', color: 'success', icon: 'i-lucide-check-circle' })
      router.push('/queue')
    }
  } catch (err: any) {
    toast.add({ title: err.data?.statusMessage || err.message || 'An error occurred while starting the scan', color: 'error', icon: 'i-lucide-alert-circle' })
    isDispatching.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="New Scan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-4xl mx-auto space-y-8">
        <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
          <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div class="relative z-10 flex flex-col h-full">
            <div class="flex items-center gap-3 p-6 pb-4 border-b border-default/50">
              <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-primary/20">
                <UIcon
                  name="i-lucide-folder-search"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h2 class="text-xl font-bold leading-tight tracking-tight">
                  Start a Scan
                </h2>
                <p class="text-muted text-sm font-medium">
                  Add a folder to the scanning queue
                </p>
              </div>
            </div>

            <div class="p-6">
              <form
                class="space-y-6"
                @submit.prevent="startScanJob"
              >
            <URadioGroup
              v-model="scanMode"
              label="Scan Target"
              description="Choose where to scan the files"
              :items="scanModes"
            />

            <div
              v-if="scanMode === 'remote'"
              class="p-4 border rounded-xl border-default bg-muted"
            >
              <UFormField label="Connected Client">
                <USelectMenu
                  v-model="selectedClientId"
                  :items="connectedClients"
                  value-key="client_id"
                  label-key="name"
                  placeholder="Select a connected client..."
                  :loading="loadingClients"
                >
                  <template #item="{ item }">
                    <div class="flex items-center gap-2">
                      <UIcon
                        name="i-lucide-monitor"
                        class="w-4 h-4 text-primary"
                      />
                      <span>{{ item.name }}</span>
                      <span class="text-xs text-dimmed">({{ item.ip_address }})</span>
                    </div>
                  </template>
                </USelectMenu>
              </UFormField>
              <p
                v-if="connectedClients.length === 0"
                class="text-sm text-warning mt-2"
              >
                No connected clients available. Go to Clients page to generate tokens and connect clients.
              </p>
            </div>

            <UFormField
              label="Target Directory Path"
              description="Enter an absolute path to a folder"
            >
              <UInput
                v-model="targetDir"
                placeholder="e.g. D:\MyFiles or /Users/name/Documents"
                icon="i-lucide-folder"
                size="lg"
                class="w-full"
                :disabled="isDispatching"
              />
            </UFormField>

            <div class="flex flex-col gap-4 p-4 border rounded-xl border-default bg-muted mt-4">
              <UCheckbox
                v-model="isSync"
                label="Synchronous Scan"
                description="Queue this job and only run one synchronous job at a time."
                :disabled="isDispatching"
              />
              <UCheckbox
                v-model="levelOneOnly"
                label="Don't scan inside folders"
                description="Scan only the first level of the target directory without entering sub-folders."
                :disabled="isDispatching"
              />
            </div>

            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="neutral"
                to="/"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isDispatching"
                size="lg"
                icon="i-lucide-play"
              >
                Start Scan Job
              </UButton>
            </div>
          </form>
            </div>
          </div>
        </div>

        <div class="bg-info/10 p-4 rounded-lg flex gap-3 text-info">
          <UIcon
            name="i-lucide-info"
            class="w-5 h-5 shrink-0 mt-0.5"
          />
          <div class="text-sm">
            <p class="font-semibold mb-1">
              Background Scanning
            </p>
            <p>Scanning large directories and calculating SHA-256 hashes can take significant time. Local scans run in the background; remote scans are executed on the connected client machine and sent back to the server.</p>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
