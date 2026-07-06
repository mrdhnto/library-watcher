<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const toast = useToast()
const jobs = ref<any[]>([])
const pending = ref(false)
const showHistory = ref(false)
const historySearch = ref('')
const historyPage = ref(1)
const itemsPerPage = 10
let pollingInterval: any = null

const isDetailsModalOpen = ref(false)
const selectedJob = ref<any>(null)
const jobDuplicates = ref<any[]>([])
const isLoadingDuplicates = ref(false)

const viewJobDetails = async (job: any) => {
  selectedJob.value = job
  isDetailsModalOpen.value = true
  jobDuplicates.value = []

  if (job.duplicates_found > 0) {
    isLoadingDuplicates.value = true
    try {
      const data = await $fetch(`/api/jobs/${job.id}/duplicates`)
      if (data) jobDuplicates.value = data as any[]
    } catch (err) {
      console.error('Failed to load duplicates:', err)
    } finally {
      isLoadingDuplicates.value = false
    }
  }
}

const activeJobDuplicates = ref<Record<number, any[]>>({})
const loadingActiveDuplicates = ref<Record<number, boolean>>({})

const toggleActiveJobDuplicates = async (jobId: number) => {
  if (activeJobDuplicates.value[jobId]) {
    activeJobDuplicates.value[jobId] = undefined as any
    return
  }
  loadingActiveDuplicates.value[jobId] = true
  try {
    const data = await $fetch(`/api/jobs/${jobId}/duplicates`)
    if (data) activeJobDuplicates.value[jobId] = data as any[]
  } catch (err) {
    console.error('Failed to load duplicates:', err)
  } finally {
    loadingActiveDuplicates.value[jobId] = false
  }
}

const fetchJobs = async () => {
  try {
    const data = await $fetch('/api/jobs')
    if (data) jobs.value = data as any[]
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
  return historyJobs.value.filter((job) => {
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
  switch (status) {
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
  switch (status) {
    case 'completed': return 'Completed'
    case 'error': return 'Error'
    case 'terminated': return 'Terminated'
    case 'pending': return 'Pending'
    case 'scanning_dir': return 'Scanning Directory'
    case 'hashing': return 'Hashing Files'
    default: return status
  }
}

const isTerminateModalOpen = ref(false)
const terminateTarget = ref<number | null>(null)

const confirmTerminate = (jobId: number) => {
  terminateTarget.value = jobId
  isTerminateModalOpen.value = true
}

const doTerminate = async () => {
  if (terminateTarget.value === null) return
  try {
    await $fetch('/api/jobs/terminate', {
      method: 'POST' as any,
      body: { jobId: terminateTarget.value }
    })
    toast.add({ title: 'Scan terminated', color: 'success', icon: 'i-lucide-check-circle' })
    isTerminateModalOpen.value = false
    fetchJobs()
  } catch (error) {
    toast.add({ title: 'Failed to terminate scan', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

const getFolderName = (path: string) => {
  if (!path) return ''
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Scan Queue">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/scan"
            icon="i-lucide-plus"
            color="primary"
          >
            New Scan
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Active Jobs -->
        <div class="space-y-4">
          <div
            v-if="activeJobs.length === 0"
            class="text-center py-12 text-muted bg-elevated rounded-lg border border-default"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-12 h-12 mx-auto mb-4 text-success opacity-50"
            />
            <p>No active scanning jobs. All processes are done.</p>
            <UButton
              to="/scan"
              icon="i-lucide-search"
              color="primary"
              class="mt-4"
            >
              Start a New Scan
            </UButton>
          </div>

          <UCard
            v-for="job in activeJobs"
            :key="job.id"
            class="relative overflow-hidden border-l-4"
            :class="`border-l-${getStatusColor(job.status)}`"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="font-semibold text-lg">
                    {{ getFolderName(job.target_path) }}
                  </h3>

                  <UTooltip :text="job.target_path">
                    <UIcon
                      name="i-lucide-info"
                      class="w-4 h-4 text-dimmed cursor-help"
                    />
                  </UTooltip>

                  <UBadge
                    :color="getStatusColor(job.status)"
                    variant="soft"
                  >
                    {{ getStatusLabel(job.status) }}
                  </UBadge>
                </div>
                <p class="text-sm text-muted">
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
                  @click="confirmTerminate(job.id)"
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

            <div class="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-muted">
              <div>
                <span class="text-muted block">Files Found</span>
                <span class="font-semibold">{{ job.total_files }}</span>
              </div>
              <div>
                <span class="text-muted block">Processed</span>
                <span class="font-semibold">{{ job.scanned_files }}</span>
              </div>
              <div>
                <span class="text-muted block">Duplicates Found</span>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-warning">{{ job.duplicates_found }}</span>
                  <UButton
                    v-if="job.duplicates_found > 0"
                    size="xs"
                    color="primary"
                    variant="soft"
                    :label="activeJobDuplicates[job.id] ? 'Hide' : 'View'"
                    @click="toggleActiveJobDuplicates(job.id)"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="activeJobDuplicates[job.id] || loadingActiveDuplicates[job.id]"
              class="mt-4 pt-4 border-t border-muted"
            >
              <div
                v-if="loadingActiveDuplicates[job.id]"
                class="flex justify-center py-4"
              >
                <USkeleton class="h-8 w-full max-w-sm" />
              </div>
              <div
                v-else-if="activeJobDuplicates[job.id] && activeJobDuplicates[job.id]!.length > 0"
                class="max-h-48 overflow-y-auto pr-2 bg-muted rounded-lg border border-default divide-y divide-muted text-sm"
              >
                <div
                  v-for="(dup, idx) in activeJobDuplicates[job.id]"
                  :key="idx"
                  class="p-2 hover:bg-elevated transition-colors"
                >
                  <p class="font-medium text-default truncate mb-0.5">
                    {{ dup.filename }}
                  </p>
                  <p class="text-xs text-dimmed truncate">
                    {{ dup.filepath }}
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- History -->
        <div
          v-if="historyJobs.length > 0"
          class="pt-4 space-y-4"
        >
          <div class="flex items-center gap-4">
            <div class="h-px flex-1 bg-muted" />
            <UButton
              :variant="showHistory ? 'soft' : 'outline'"
              color="neutral"
              :icon="showHistory ? 'i-lucide-eye-off' : 'i-lucide-history'"
              size="sm"
              @click="showHistory = !showHistory"
            >
              {{ showHistory ? 'Hide History' : 'Show Scan History (' + historyJobs.length + ')' }}
            </UButton>
            <div class="h-px flex-1 bg-muted" />
          </div>

          <div
            v-if="showHistory"
            class="space-y-4"
          >
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 class="text-lg font-semibold text-toned">
                Scan History
              </h2>
              <UInput
                v-model="historySearch"
                icon="i-lucide-search"
                placeholder="Search history folder..."
                size="sm"
                class="w-full md:w-64"
              />
            </div>

            <div
              v-if="filteredHistoryJobs.length === 0"
              class="text-center py-8 text-muted"
            >
              <p>No history entries found matching your search.</p>
            </div>

            <div
              v-else
              class="space-y-4"
            >
              <UCard
                v-for="job in paginatedHistoryJobs"
                :key="job.id"
                class="opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex flex-col"
                @click="viewJobDetails(job)"
              >
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-3 mb-1">
                      <h3 class="font-medium truncate max-w-sm">
                        {{ getFolderName(job.target_path) }}
                      </h3>

                      <UTooltip :text="job.target_path">
                        <UIcon
                          name="i-lucide-info"
                          class="w-4 h-4 text-dimmed cursor-help"
                          @click.stop
                        />
                      </UTooltip>

                      <UBadge
                        :color="getStatusColor(job.status)"
                        variant="soft"
                        size="sm"
                      >
                        {{ getStatusLabel(job.status) }}
                      </UBadge>
                    </div>
                    <p class="text-xs text-muted">
                      Started: {{ new Date(job.started_at).toLocaleString() }}
                      <span v-if="job.completed_at">
                        • Finished: {{ new Date(job.completed_at).toLocaleString() }}
                      </span>
                    </p>
                  </div>
                  <div class="text-right text-xs">
                    <span class="font-semibold">{{ job.scanned_files }} files</span>
                    <span class="text-dimmed block">{{ job.duplicates_found }} duplicates</span>
                  </div>
                </div>
                <div
                  v-if="job.status === 'error'"
                  class="mt-2 p-2 bg-error/10 text-error rounded text-xs"
                >
                  {{ job.error_message }}
                </div>
              </UCard>

              <div
                v-if="filteredHistoryJobs.length > itemsPerPage"
                class="flex justify-center pt-4"
              >
                <UPagination
                  v-model:page="historyPage"
                  :total="filteredHistoryJobs.length"
                  :items-per-page="itemsPerPage"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Terminate Confirmation Modal -->
        <UModal v-model:open="isTerminateModalOpen">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-error/20 rounded-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
              <div class="absolute -top-1/2 -right-1/4 w-full h-full bg-error/10 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-error/10">
                  <div class="flex items-center gap-3 text-error">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-error/10 border border-error/20">
                      <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 animate-pulse" />
                    </div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Terminate Scan</h3>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-error/10 hover:text-error transition-colors" @click="isTerminateModalOpen = false" />
                </div>
                
                <div class="p-6 text-center">
                  <p class="text-lg">Are you sure you want to terminate this scan?</p>
                  <p class="text-sm text-muted mt-2">In-progress files will be discarded.</p>
                </div>
                
                <div class="flex justify-end gap-3 p-6 pt-4 border-t border-error/10 bg-error/5">
                  <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="isTerminateModalOpen = false">Cancel</UButton>
                  <UButton color="error" class="px-5 shadow-lg shadow-error/30 transition-transform hover:scale-105 active:scale-95" @click="doTerminate">Terminate</UButton>
                </div>
              </div>
            </div>
          </template>
        </UModal>

        <!-- Job Details Modal -->
        <UModal v-model:open="isDetailsModalOpen" :ui="{ content: 'sm:max-w-2xl' }">
          <template #content>
            <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
              <div class="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div class="relative z-10 flex flex-col h-full">
                <div class="flex items-center justify-between p-6 pb-4 border-b border-default/50">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-primary/20">
                      <UIcon name="i-lucide-folder-search" class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-bold text-lg leading-tight tracking-tight">Scan Details</h3>
                      <p class="text-xs text-muted font-medium break-all max-w-[400px] truncate">{{ selectedJob?.target_path }}</p>
                    </div>
                  </div>
                  <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="isDetailsModalOpen = false" />
                </div>
                
                <div class="p-6 space-y-6">
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-xl border border-default/30">
                    <div>
                      <p class="text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Status</p>
                      <UBadge :color="getStatusColor(selectedJob?.status || '')" variant="soft" class="shadow-sm">
                        {{ getStatusLabel(selectedJob?.status || '') }}
                      </UBadge>
                    </div>
                    <div>
                      <p class="text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Files Scanned</p>
                      <p class="font-bold text-lg text-default">{{ selectedJob?.scanned_files || 0 }}</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Duplicates Found</p>
                      <p class="font-bold text-lg text-warning">{{ selectedJob?.duplicates_found || 0 }}</p>
                    </div>
                  </div>

                  <div v-if="selectedJob?.error_message" class="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-sm shadow-inner">
                    <p class="font-bold mb-1 flex items-center gap-2"><UIcon name="i-lucide-alert-circle" class="w-4 h-4" /> Error Details</p>
                    <p>{{ selectedJob?.error_message }}</p>
                  </div>

                  <div>
                    <h4 class="font-bold mb-3 flex items-center gap-2 text-default">
                      <UIcon name="i-lucide-copy" class="w-4 h-4" :class="selectedJob?.duplicates_found > 0 ? 'text-warning' : 'text-dimmed'" />
                      Duplicate Information
                    </h4>

                    <div v-if="isLoadingDuplicates" class="flex justify-center py-8">
                      <USkeleton class="h-8 w-full" />
                    </div>

                    <div v-else-if="jobDuplicates.length > 0" class="max-h-72 overflow-y-auto pr-2 border border-default/50 rounded-xl bg-muted/50 divide-y divide-muted/50 shadow-inner">
                      <div v-for="(dup, idx) in jobDuplicates" :key="idx" class="p-3 hover:bg-elevated transition-colors">
                        <p class="font-semibold text-default break-all text-sm mb-1">{{ dup.filename }}</p>
                        <p class="text-xs text-dimmed break-all">{{ dup.filepath }}</p>
                      </div>
                    </div>

                    <div v-else class="text-sm text-muted italic p-6 text-center border-2 border-dashed border-default/30 rounded-xl bg-muted/20">
                      No duplicate found in this scan.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
