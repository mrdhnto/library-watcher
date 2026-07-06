<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const toast = useToast()
const items = ref<any[]>([])
const pending = ref(false)
const total = ref(0)
const page = ref(1)
const showDuplicatesOnly = ref(false)
const searchQuery = ref('')
const selected = ref<any[]>([])
const isActioning = ref(false)
const isDeleteModalOpen = ref(false)
const deleteFromDisk = ref(false)

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedSearchQuery = ref('')

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery.value = searchQuery.value
  }, 300)
})

// Scan Select state
const isScanSelectModalOpen = ref(false)
const scanSelectPath = ref('')
const scanSelectResults = ref<any[]>([])
const scanSelectSelected = ref<any[]>([])
const isScanSelectLoading = ref(false)
const scanSelectError = ref('')
const scanSelectScannedCount = ref(0)
const isScanSelectDeleteModalOpen = ref(false)
const scanSelectDeleteFromDisk = ref(false)
const isScanSelectActioning = ref(false)

const columns = [
  { id: 'select', header: '', size: 40 },
  { accessorKey: 'filename', header: 'File Name', size: 300 },
  { accessorKey: 'size', header: 'Size' },
  { accessorKey: 'hash', header: 'Hash (SHA-256)' },
  { id: 'uploaded', header: 'Uploaded' },
  { id: 'status', header: 'Status' }
]

const fetchFiles = async () => {
  pending.value = true
  try {
    const data = await $fetch('/api/files', {
      query: {
        page: page.value,
        limit: 50,
        duplicates: showDuplicatesOnly.value ? 'true' : 'false',
        search: debouncedSearchQuery.value || undefined
      }
    })
    if (data) {
      items.value = (data as any).items
      total.value = (data as any).total
    }
  } catch {
    toast.add({ title: 'Failed to load files', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    pending.value = false
  }
}

watch([page, showDuplicatesOnly, debouncedSearchQuery], () => {
  fetchFiles()
})

onMounted(() => {
  fetchFiles()
})

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const openDeleteModal = () => {
  if (!selected.value.length) return
  isDeleteModalOpen.value = true
}

const performBulkAction = async (action: 'delete' | 'upload', value: boolean, fromDisk = false) => {
  if (!selected.value.length) return

  isActioning.value = true

  try {
    const fileIds = selected.value.map(row => row.id)
    await $fetch('/api/files/action', {
      method: 'POST',
      body: { fileIds, action, value, deleteFromDisk: fromDisk }
    })

    selected.value = []
    isDeleteModalOpen.value = false
    deleteFromDisk.value = false
    toast.add({ title: `${selected.value.length} file(s) updated`, color: 'success', icon: 'i-lucide-check-circle' })
    await fetchFiles()
  } catch (err: any) {
    toast.add({ title: err.message || `Failed to perform ${action} action`, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    isActioning.value = false
  }
}

const bulkActions = [
  [
    {
      label: 'Mark as Uploaded',
      icon: 'i-lucide-cloud-upload',
      onSelect: () => performBulkAction('upload', true)
    },
    {
      label: 'Remove Uploaded Mark',
      icon: 'i-lucide-cloud-off',
      onSelect: () => performBulkAction('upload', false)
    }
  ],
  [
    {
      label: 'Mark as Deleted (Hide)',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: openDeleteModal
    }
  ]
]

// Scan Select functions
const openScanSelectModal = () => {
  isScanSelectModalOpen.value = true
  scanSelectPath.value = ''
  scanSelectResults.value = []
  scanSelectSelected.value = []
  scanSelectError.value = ''
  scanSelectScannedCount.value = 0
}

const performScanSelect = async () => {
  if (!scanSelectPath.value.trim()) return

  isScanSelectLoading.value = true
  scanSelectError.value = ''
  scanSelectResults.value = []
  scanSelectSelected.value = []

  try {
    const data = await $fetch('/api/files/scan-match', {
      method: 'POST',
      body: { path: scanSelectPath.value.trim() }
    }) as any

    scanSelectResults.value = data.matches || []
    scanSelectScannedCount.value = data.scannedCount || 0
    scanSelectSelected.value = [...scanSelectResults.value]
  } catch (err: any) {
    scanSelectError.value = err.data?.message || err.statusMessage || err.message || 'Failed to scan directory'
  } finally {
    isScanSelectLoading.value = false
  }
}

const openScanSelectDeleteModal = () => {
  if (!scanSelectSelected.value.length) return
  isScanSelectDeleteModalOpen.value = true
}

const performScanSelectAction = async (action: 'delete' | 'upload', value: boolean, fromDisk = false) => {
  if (!scanSelectSelected.value.length) return

  isScanSelectActioning.value = true
  scanSelectError.value = ''

  try {
    const fileIds = scanSelectSelected.value.map((r: any) => r.id)
    await $fetch('/api/files/action', {
      method: 'POST',
      body: { fileIds, action, value, deleteFromDisk: fromDisk }
    })

    const actionedIds = new Set(fileIds)
    scanSelectResults.value = scanSelectResults.value.filter((r: any) => !actionedIds.has(r.id))
    scanSelectSelected.value = []
    isScanSelectDeleteModalOpen.value = false
    scanSelectDeleteFromDisk.value = false
    toast.add({ title: `${fileIds.length} file(s) updated`, color: 'success', icon: 'i-lucide-check-circle' })
    await fetchFiles()
  } catch (err: any) {
    scanSelectError.value = err.data?.message || err.message || `Failed to perform ${action} action`
  } finally {
    isScanSelectActioning.value = false
  }
}

const scanSelectBulkActions = [
  [
    {
      label: 'Mark as Uploaded',
      icon: 'i-lucide-cloud-upload',
      onSelect: () => performScanSelectAction('upload', true)
    },
    {
      label: 'Remove Uploaded Mark',
      icon: 'i-lucide-cloud-off',
      onSelect: () => performScanSelectAction('upload', false)
    }
  ],
  [
    {
      label: 'Mark as Deleted (Hide)',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: openScanSelectDeleteModal
    }
  ]
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Library Files">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search files..."
            class="w-full md:w-64"
          />
          <UCheckbox
            v-model="showDuplicatesOnly"
            label="Show duplicates only"
          />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-folder-search"
            color="neutral"
            variant="outline"
            @click="openScanSelectModal"
          >
            Select by Scan
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="overflow-x-auto">
        <UTable
          :data="items"
          :columns="columns"
          :loading="pending"
          class="w-full min-w-[700px]"
        >
          <template #select-header>
            <UCheckbox
              class="m-1"
              :model-value="selected.length > 0 && selected.length === items.length"
              :indeterminate="selected.length > 0 && selected.length < items.length"
              @update:model-value="(val) => selected = val ? [...items] : []"
            />
          </template>

          <template #select-cell="{ row }">
            <UCheckbox
              class="m-1"
              :model-value="selected.some(s => s.id === row.original.id)"
              @update:model-value="(val) => {
                if (val) selected.push(row.original)
                else selected = selected.filter(s => s.id !== row.original.id)
              }"
            />
          </template>

          <template #size-cell="{ row }">
            {{ formatSize((row.original as any).size) }}
          </template>

          <template #hash-cell="{ row }">
            <span
              class="font-mono text-xs truncate max-w-[150px] inline-block"
              :title="(row.original as any).hash"
            >
              {{ (row.original as any).hash.substring(0, 16) }}...
            </span>
          </template>

          <template #uploaded-cell="{ row }">
            <UIcon
              v-if="(row.original as any).is_uploaded"
              name="i-lucide-cloud-check"
              class="w-5 h-5 text-success"
              title="Uploaded to Cloud"
            />
            <UIcon
              v-else
              name="i-lucide-cloud-off"
              class="w-5 h-5 text-dimmed"
              title="Not Uploaded"
            />
          </template>

          <template #status-cell="{ row }">
            <div
              v-if="(row.original as any).duplicate_count > 0"
              class="flex flex-col gap-1 items-start"
            >
              <UBadge
                color="error"
                variant="soft"
              >
                Duplicate
              </UBadge>
              <span
                class="text-xs text-dimmed max-w-[200px] truncate"
                :title="'Matches: ' + (row.original as any).duplicate_with"
              >
                Matches: {{ (row.original as any).duplicate_with }}
              </span>
            </div>
            <UBadge
              v-else
              color="success"
              variant="soft"
            >
              Unique
            </UBadge>
          </template>
        </UTable>
      </div>

      <!-- Selection Bar & Pagination -->
      <div class="flex items-center justify-between px-3 py-3.5 border-t border-default">
        <div class="flex items-center gap-2">
          <span
            v-if="selected.length"
            class="text-sm text-primary font-medium"
          >{{ selected.length }} file(s) selected</span>
          <UDropdownMenu
            v-if="selected.length"
            :items="bulkActions"
          >
            <UButton
              color="neutral"
              variant="solid"
              size="sm"
              trailing-icon="i-lucide-chevron-down"
              :loading="isActioning"
            >
              Bulk Actions
            </UButton>
          </UDropdownMenu>
        </div>
        <UPagination
          v-model:page="page"
          :items-per-page="50"
          :total="total"
        />
      </div>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="isDeleteModalOpen">
        <template #content>
          <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-error/20 rounded-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
            <div class="absolute -top-1/2 -right-1/4 w-full h-full bg-error/10 rounded-full blur-3xl pointer-events-none" />
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between p-6 pb-4 border-b border-error/10">
                <div class="flex items-center gap-3 text-error">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-error/10 border border-error/20">
                    <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 class="font-bold text-lg leading-tight tracking-tight">Confirm Deletion</h3>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-error/10 hover:text-error transition-colors" @click="isDeleteModalOpen = false" />
              </div>
              
              <div class="p-6 space-y-4">
                <p class="text-default text-lg">Are you sure you want to delete <strong class="text-error font-bold">{{ selected.length }}</strong> file(s) from the list?</p>
                
                <div class="max-h-[200px] overflow-y-auto border border-error/20 rounded-xl bg-error/5 p-3 text-sm shadow-inner">
                  <ul class="space-y-2">
                    <li v-for="file in selected" :key="file.id" class="truncate flex items-center gap-2 text-default">
                      <UIcon name="i-lucide-file" class="w-4 h-4 text-error/70" />
                      {{ file.filename }}
                    </li>
                  </ul>
                </div>
                
                <div class="pt-4 border-t border-error/10 space-y-3">
                  <UCheckbox v-model="deleteFromDisk" label="Delete files also from disk" color="error" />
                  
                  <div v-if="deleteFromDisk" class="p-4 bg-error/10 border border-error/20 rounded-xl text-xs text-error shadow-inner">
                    <UIcon name="i-lucide-alert-octagon" class="inline-block w-4 h-4 mr-1 align-text-bottom animate-pulse" />
                    <strong class="uppercase font-bold tracking-wider">Warning:</strong> This action cannot be undone. Clicking proceed will <strong class="font-bold">permanently delete</strong> the files from your storage device.
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end gap-3 p-6 pt-4 border-t border-error/10 bg-error/5">
                <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="isDeleteModalOpen = false">Cancel</UButton>
                <UButton color="error" class="px-5 shadow-lg shadow-error/30 transition-transform hover:scale-105 active:scale-95" :loading="isActioning" @click="performBulkAction('delete', true, deleteFromDisk)">Proceed</UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Scan Select Modal -->
      <UModal v-model:open="isScanSelectModalOpen" :ui="{ content: 'sm:max-w-3xl' }">
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
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Select by Folder Scan</h3>
                    <p class="text-xs text-muted font-medium">Find files within a specific folder path</p>
                  </div>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="isScanSelectModalOpen = false" />
              </div>
              
              <div class="p-6 space-y-6">
                <!-- Path Input -->
                <div class="flex gap-3">
                  <UInput v-model="scanSelectPath" placeholder="Enter absolute folder path to scan..." icon="i-lucide-folder" size="lg" class="flex-1 transition-all duration-300 hover:ring-primary/50 focus:ring-primary" @keyup.enter="performScanSelect" />
                  <UButton color="primary" :loading="isScanSelectLoading" :disabled="!scanSelectPath.trim()" size="lg" class="px-6 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95" @click="performScanSelect">Scan</UButton>
                </div>

                <!-- Error -->
                <div v-if="scanSelectError" class="p-4 text-sm text-error bg-error/10 border border-error/20 rounded-xl shadow-inner">
                  <UIcon name="i-lucide-alert-circle" class="w-4 h-4 mr-2 inline-block align-text-bottom" />
                  {{ scanSelectError }}
                </div>

                <!-- Loading -->
                <div v-if="isScanSelectLoading" class="flex flex-col items-center justify-center py-12 gap-4 bg-muted/20 rounded-xl border border-dashed border-default/30">
                  <USkeleton class="h-8 w-64 rounded-lg" />
                  <p class="text-sm text-muted font-medium animate-pulse">Scanning directory and matching files...</p>
                </div>

                <!-- Results -->
                <div v-else-if="scanSelectScannedCount > 0" class="space-y-4">
                  <div class="flex items-center justify-between text-sm bg-muted/40 p-4 rounded-xl border border-default/30 shadow-inner">
                    <p class="text-muted font-medium">
                      Found <span class="font-bold text-primary px-1">{{ scanSelectResults.length }}</span> matching files out of <span class="font-bold px-1">{{ scanSelectScannedCount }}</span> scanned.
                    </p>
                    <div v-if="scanSelectResults.length > 0" class="flex items-center gap-3">
                      <span v-if="scanSelectSelected.length" class="text-primary font-bold tracking-tight bg-primary/10 px-2 py-1 rounded-md">{{ scanSelectSelected.length }} selected</span>
                      <UDropdownMenu v-if="scanSelectSelected.length" :items="scanSelectBulkActions">
                        <UButton color="primary" variant="solid" size="sm" trailing-icon="i-lucide-chevron-down" :loading="isScanSelectActioning" class="shadow-md shadow-primary/20">Actions</UButton>
                      </UDropdownMenu>
                    </div>
                  </div>

                  <div v-if="scanSelectResults.length === 0" class="text-center py-12 text-muted border-2 border-dashed border-default/30 rounded-xl bg-muted/20">
                    <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                    <p class="font-medium">No matching files found in the database.</p>
                  </div>

                  <div v-else class="max-h-[400px] overflow-y-auto border border-default/50 rounded-xl divide-y divide-muted/50 bg-muted/30 shadow-inner">
                    <div class="flex items-center gap-3 px-4 py-3 bg-elevated/90 backdrop-blur-sm sticky top-0 z-10 border-b border-default/50">
                      <UCheckbox :model-value="scanSelectSelected.length > 0 && scanSelectSelected.length === scanSelectResults.length" :indeterminate="scanSelectSelected.length > 0 && scanSelectSelected.length < scanSelectResults.length" @update:model-value="(val) => scanSelectSelected = val ? [...scanSelectResults] : []" />
                      <span class="text-xs font-bold text-default uppercase tracking-wider">Select All</span>
                    </div>

                    <div v-for="file in scanSelectResults" :key="file.id" class="flex items-center gap-4 px-4 py-3 hover:bg-elevated transition-colors cursor-pointer" @click="() => {
                        const idx = scanSelectSelected.findIndex((s: any) => s.id === file.id)
                        if (idx >= 0) scanSelectSelected.splice(idx, 1)
                        else scanSelectSelected.push(file)
                      }">
                      <UCheckbox :model-value="scanSelectSelected.some((s: any) => s.id === file.id)" @click.stop @update:model-value="(val) => {
                          if (val) scanSelectSelected.push(file)
                          else scanSelectSelected = scanSelectSelected.filter((s: any) => s.id !== file.id)
                        }" />
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm text-default truncate mb-0.5">{{ file.filename }}</p>
                        <p class="text-xs text-dimmed truncate">{{ file.filepath }}</p>
                      </div>
                      <div class="flex items-center gap-3 shrink-0">
                        <span class="text-xs font-medium text-dimmed bg-muted px-2 py-1 rounded-md">{{ formatSize(file.size) }}</span>
                        <UIcon v-if="file.is_uploaded" name="i-lucide-cloud-check" class="w-5 h-5 text-success" title="Uploaded" />
                        <UBadge v-if="file.duplicate_count > 0" color="error" variant="soft" size="sm" class="shadow-sm">Dup</UBadge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Scan Select Delete Confirmation Modal -->
      <UModal v-model:open="isScanSelectDeleteModalOpen">
        <template #content>
          <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-error/20 rounded-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
            <div class="absolute -top-1/2 -right-1/4 w-full h-full bg-error/10 rounded-full blur-3xl pointer-events-none" />
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between p-6 pb-4 border-b border-error/10">
                <div class="flex items-center gap-3 text-error">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-error/10 border border-error/20">
                    <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 class="font-bold text-lg leading-tight tracking-tight">Confirm Deletion</h3>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-error/10 hover:text-error transition-colors" @click="isScanSelectDeleteModalOpen = false" />
              </div>
              
              <div class="p-6 space-y-4">
                <p class="text-default text-lg">Are you sure you want to delete <strong class="text-error font-bold">{{ scanSelectSelected.length }}</strong> file(s) from the list?</p>
                
                <div class="max-h-[200px] overflow-y-auto border border-error/20 rounded-xl bg-error/5 p-3 text-sm shadow-inner">
                  <ul class="space-y-2">
                    <li v-for="file in scanSelectSelected" :key="file.id" class="truncate flex items-center gap-2 text-default">
                      <UIcon name="i-lucide-file" class="w-4 h-4 text-error/70" />
                      {{ file.filename }}
                    </li>
                  </ul>
                </div>
                
                <div class="pt-4 border-t border-error/10 space-y-3">
                  <UCheckbox v-model="scanSelectDeleteFromDisk" label="Delete files also from disk" color="error" />
                  
                  <div v-if="scanSelectDeleteFromDisk" class="p-4 bg-error/10 border border-error/20 rounded-xl text-xs text-error shadow-inner">
                    <UIcon name="i-lucide-alert-octagon" class="inline-block w-4 h-4 mr-1 align-text-bottom animate-pulse" />
                    <strong class="uppercase font-bold tracking-wider">Warning:</strong> This action cannot be undone. Clicking proceed will <strong class="font-bold">permanently delete</strong> the files from your storage device.
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end gap-3 p-6 pt-4 border-t border-error/10 bg-error/5">
                <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="isScanSelectDeleteModalOpen = false">Cancel</UButton>
                <UButton color="error" class="px-5 shadow-lg shadow-error/30 transition-transform hover:scale-105 active:scale-95" :loading="isScanSelectActioning" @click="performScanSelectAction('delete', true, scanSelectDeleteFromDisk)">Proceed</UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
