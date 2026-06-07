<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const targetDir = ref('')
const isSync = ref(false)
const levelOneOnly = ref(false)
const isDispatching = ref(false)
const errorMsg = ref('')

const scanMode = ref<'local' | 'remote'>('local')
const clients = ref<any[]>([])
const selectedClientId = ref('')
const loadingClients = ref(false)

const connectedClients = computed(() =>
  clients.value.filter(c => c.status === 'connected')
)

const fetchClients = async () => {
  loadingClients.value = true
  try {
    const data = await $fetch('/api/clients')
    if (data) clients.value = data as any[]
  } catch {
    // Server may not support clients yet
  } finally {
    loadingClients.value = false
  }
}

onMounted(fetchClients)

const startScanJob = async () => {
  if (!targetDir.value) {
    errorMsg.value = 'Please enter a target directory path'
    return
  }

  if (scanMode.value === 'remote' && !selectedClientId.value) {
    errorMsg.value = 'Please select a remote client'
    return
  }

  errorMsg.value = ''
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
      router.push('/queue')
    }
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'An error occurred while starting the scan'
    isDispatching.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-2xl mx-auto space-y-8">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary/10 rounded-lg text-primary">
            <UIcon name="i-lucide-folder-search" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-xl font-bold">New Scan</h2>
            <p class="text-gray-500 text-sm">Add a folder to the scanning queue</p>
          </div>
        </div>
      </template>

      <form @submit.prevent="startScanJob" class="space-y-6">
        <!-- Scan Mode Toggle -->
        <URadioGroup
          v-model="scanMode"
          label="Scan Target"
          description="Choose where to scan the files"
          :items="[
            { value: 'local', label: 'Local Server', description: 'Scan a folder on this server' },
            { value: 'remote', label: 'Remote Client', description: 'Scan via a connected client machine' }
          ]"
        />

        <!-- Remote Client Selector -->
        <div v-if="scanMode === 'remote'" class="p-4 border rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <UFormField label="Connected Client">
            <USelectMenu
              v-model="selectedClientId"
              :items="connectedClients"
              value-key="client_id"
              label-key="name"
              placeholder="Select a connected client..."
              :loading="loadingClients"
            >
              <template #option="{ item }">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-monitor" class="w-4 h-4 text-primary" />
                  <span>{{ item.name }}</span>
                  <span class="text-xs text-gray-500">({{ item.ip_address }})</span>
                </div>
              </template>
            </USelectMenu>
          </UFormField>
          <p v-if="connectedClients.length === 0" class="text-sm text-orange-500 mt-2">
            No connected clients available. Go to Clients page to generate tokens and connect clients.
          </p>
        </div>

        <UFormField
          label="Target Directory Path"
          description="Enter an absolute path to a folder"
          :error="errorMsg"
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

        <div class="flex flex-col gap-4 p-4 border rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 mt-4">
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
          <UButton variant="ghost" color="neutral" to="/">Cancel</UButton>
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
    </UCard>

    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-blue-800 dark:text-blue-300">
      <UIcon name="i-lucide-info" class="w-5 h-5 shrink-0 mt-0.5" />
      <div class="text-sm">
        <p class="font-semibold mb-1">Background Scanning</p>
        <p>Scanning large directories and calculating SHA-256 hashes can take significant time. Local scans run in the background; remote scans are executed on the connected client machine and sent back to the server.</p>
      </div>
    </div>
  </UContainer>
</template>
