<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const jobs = ref<any[]>([])
const pending = ref(false)
const showHistory = ref(false)
const historySearch = ref('')
const historyPage = ref(1)
const itemsPerPage = 10
let pollingInterval: any = null

const fetchJobs = async () => {
  try {
    const data = await $fetch('/api/jobs')
    // @ts-ignore
    if(data) jobs.value = data
  } catch (error) {
    console.error('Failed to fetch jobs:', error)
  }
}

const activeStatuses = ['pending', 'scanning_dir', 'hashing']

const activeJobs = computed(() => {
  return jobs.value.filter(j => activeStatuses.includes(j.status))
})

const historyJobs = computed(() => {
  return jobs.value.filter(j => !activeStatuses.includes(j.status))
})

const filteredHistoryJobs = computed(() => {
  if (!historySearch.value) return historyJobs.value
  
  const search = historySearch.value.toLowerCase()
  return historyJobs.value.filter(job => {
    const fullPath = job?.target_path || ''
    const folderName = (getFolderName(fullPath) || '').toLowerCase()
    return folderName.includes(search) || fullPath.toLowerCase().includes(search)
  })
})

const paginatedHistoryJobs = computed(() => {
  const start = (historyPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredHistoryJobs.value.slice(start, end)
})

const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed': return 'success'
    case 'error': return 'error'
    case 'terminated': return 'neutral'
    case 'pending': return 'warning'
    case 'scanning_dir':
    case 'hashing': return 'primary'
    default: return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch(status) {
    case 'completed': return 'Completed'
    case 'error': return 'Error'
    case 'terminated': return 'Terminated'
    case 'pending': return 'Pending'
    case 'scanning_dir': return 'Scanning Directory'
    case 'hashing': return 'Hashing Files'
    default: return status
  }
}

const terminateJob = async (jobId: number) => {
  if (!confirm('Are you sure you want to terminate this scan?')) return
  
  try {
    await $fetch('/api/jobs/terminate', {
      method: 'POST' as any,
      body: { jobId }
    })
    fetchJobs()
  } catch (error) {
    console.error('Failed to terminate job:', error)
  }
}

const getFolderName = (path: string) => {
  if (!path) return ''
  // Handle both Windows and POSIX paths
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : path
}

watch(historySearch, () => {
  historyPage.value = 1
})

onMounted(() => {
  fetchJobs()
  pollingInterval = setInterval(fetchJobs, 2000)
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Scan Queue</h1>
        <p class="text-gray-500">Monitor your background scanning jobs</p>
      </div>
      <UButton to="/scan" icon="i-lucide-plus" color="primary">New Scan</UButton>
    </div>

    <!-- Active Jobs -->
    <div class="space-y-4">
      <div v-if="activeJobs.length === 0" class="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <UIcon name="i-lucide-check-circle" class="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
        <p>No active scanning jobs. All processes are done.</p>
        <UButton v-if="historyJobs.length > 0 && !showHistory" variant="link" color="primary" @click="showHistory = true" class="mt-2">
          View Scan History
        </UButton>
      </div>
      
      <UCard v-for="job in activeJobs" :key="job.id" class="relative overflow-hidden border-l-4" :class="`border-l-${getStatusColor(job.status)}`">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h3 class="font-semibold text-lg">{{ getFolderName(job.target_path) }}</h3>
              
              <UTooltip :text="job.target_path">
                <UIcon name="i-lucide-info" class="w-4 h-4 text-gray-400 cursor-help" />
              </UTooltip>

              <UBadge :color="getStatusColor(job.status)" variant="soft">
                {{ getStatusLabel(job.status) }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-500">
              Started: {{ new Date(job.started_at).toLocaleString() }}
            </p>
          </div>
          <div class="flex items-center gap-4">
             <UButton 
               v-if="['pending', 'scanning_dir', 'hashing'].includes(job.status)"
               color="error" 
               variant="ghost" 
               icon="i-lucide-square" 
               size="xs"
               @click="terminateJob(job.id)"
             >
               Terminate
             </UButton>
             <span class="text-2xl font-bold">
                {{ job.total_files > 0 ? Math.round((job.scanned_files / job.total_files) * 100) : 0 }}%
             </span>
          </div>
        </div>

        <UProgress 
          :value="job.scanned_files" 
          :max="job.total_files > 0 ? job.total_files : 100" 
          :color="getStatusColor(job.status)"
          indicator 
          class="mb-4"
        />

        <div class="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div>
            <span class="text-gray-500 block">Files Found</span>
            <span class="font-semibold">{{ job.total_files }}</span>
          </div>
          <div>
            <span class="text-gray-500 block">Processed</span>
            <span class="font-semibold">{{ job.scanned_files }}</span>
          </div>
          <div>
            <span class="text-gray-500 block">Duplicates Found</span>
            <span class="font-semibold text-orange-500">{{ job.duplicates_found }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- History -->
    <div v-if="historyJobs.length > 0" class="pt-4 space-y-4">
      <div class="flex items-center gap-4">
        <div class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
        <UButton 
          :variant="showHistory ? 'soft' : 'outline'" 
          color="neutral" 
          :icon="showHistory ? 'i-lucide-eye-off' : 'i-lucide-history'"
          @click="showHistory = !showHistory"
          size="sm"
        >
          {{ showHistory ? 'Hide History' : 'Show Scan History (' + historyJobs.length + ')' }}
        </UButton>
        <div class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
      </div>

      <div v-if="showHistory" class="space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Scan History</h2>
          <UInput 
            v-model="historySearch" 
            icon="i-lucide-search" 
            placeholder="Search history folder..." 
            size="sm"
            class="w-full md:w-64"
          />
        </div>

        <div v-if="filteredHistoryJobs.length === 0" class="text-center py-8 text-gray-500">
          <p>No history entries found matching your search.</p>
        </div>

        <div v-else class="space-y-4">
          <UCard v-for="job in paginatedHistoryJobs" :key="job.id" class="opacity-80 hover:opacity-100 transition-opacity">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="font-medium truncate max-w-sm">{{ getFolderName(job.target_path) }}</h3>
                  
                  <UTooltip :text="job.target_path">
                    <UIcon name="i-lucide-info" class="w-4 h-4 text-gray-400 cursor-help" />
                  </UTooltip>

                  <UBadge :color="getStatusColor(job.status)" variant="soft" size="sm">
                    {{ getStatusLabel(job.status) }}
                  </UBadge>
                </div>
                <p class="text-xs text-gray-500">
                  Started: {{ new Date(job.started_at).toLocaleString() }}
                  <span v-if="job.completed_at">
                    • Finished: {{ new Date(job.completed_at).toLocaleString() }}
                  </span>
                </p>
              </div>
              <div class="text-right text-xs">
                <span class="font-semibold">{{ job.scanned_files }} files</span>
                <span class="text-gray-400 block">{{ job.duplicates_found }} duplicates</span>
              </div>
            </div>
            <div v-if="job.status === 'error'" class="mt-2 p-2 bg-red-50 text-red-600 rounded text-xs">
              {{ job.error_message }}
            </div>
          </UCard>

          <!-- History Pagination -->
          <div v-if="filteredHistoryJobs.length > itemsPerPage" class="flex justify-center pt-4">
            <UPagination 
              v-model:page="historyPage" 
              :total="filteredHistoryJobs.length" 
              :items-per-page="itemsPerPage" 
            />
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>
