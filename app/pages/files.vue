<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const items = ref<any[]>([])
const pending = ref(false)
const total = ref(0)
const page = ref(1)
const showDuplicatesOnly = ref(false)
const searchQuery = ref('')
const errorMsg = ref('')
const selected = ref<any[]>([])
const isActioning = ref(false)
const isDeleteModalOpen = ref(false)
const deleteFromDisk = ref(false)

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
  { id: 'status', header: 'Status' },
]

const fetchFiles = async () => {
  pending.value = true
  errorMsg.value = ''
  try {
    const data = await $fetch('/api/files', {
      query: {
        page: page.value,
        limit: 50,
        duplicates: showDuplicatesOnly.value ? 'true' : 'false',
        search: searchQuery.value || undefined
      }
    })
    // @ts-ignore
    if(data) {
       // @ts-ignore
      items.value = data.items
       // @ts-ignore
      total.value = data.total
    }
  } catch (error: any) {
    errorMsg.value = error.message || 'Failed to load files'
    console.error(error)
  } finally {
    pending.value = false
  }
}

watch([page, showDuplicatesOnly, searchQuery], () => {
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
  errorMsg.value = ''

  try {
    const fileIds = selected.value.map(row => row.id)
    await $fetch('/api/files/action', {
      method: 'POST',
      body: { fileIds, action, value, deleteFromDisk: fromDisk }
    })
    
    // Refresh table and clear selection
    selected.value = []
    isDeleteModalOpen.value = false
    deleteFromDisk.value = false
    await fetchFiles()
  } catch (error: any) {
    errorMsg.value = error.message || `Failed to perform ${action} action`
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
    // Default select all
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

    // Remove actioned items from results
    const actionedIds = new Set(fileIds)
    scanSelectResults.value = scanSelectResults.value.filter((r: any) => !actionedIds.has(r.id))
    scanSelectSelected.value = []
    isScanSelectDeleteModalOpen.value = false
    scanSelectDeleteFromDisk.value = false

    // Refresh main table
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
  <UContainer class="py-8 space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Library Files</h1>
        <p class="text-gray-500">View and manage all your scanned files</p>
      </div>

      <div class="flex items-center gap-4">
        <UInput 
          v-model="searchQuery" 
          icon="i-lucide-search" 
          placeholder="Search files..." 
          @keyup.enter="fetchFiles"
          class="w-full md:w-64"
        />
        <UCheckbox 
          v-model="showDuplicatesOnly" 
          label="Show duplicates only" 
        />
        <UButton
          icon="i-lucide-folder-search"
          color="neutral"
          variant="outline"
          @click="openScanSelectModal"
        >
          Select by Scan
        </UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-row items-center justify-between">
          <div class="font-medium text-gray-700 dark:text-gray-200">
            <span v-if="selected.length" class="text-primary">{{ selected.length }} files selected</span>
            <span v-else>All Scanned Files</span>
          </div>

          <UDropdownMenu v-if="selected.length" :items="bulkActions">
            <UButton 
              color="neutral" 
              variant="solid" 
              trailing-icon="i-lucide-chevron-down"
              :loading="isActioning"
            >
              Bulk Actions
            </UButton>
          </UDropdownMenu>
        </div>
      </template>

      <div v-if="errorMsg" class="p-4 mb-4 text-red-500 bg-red-50 rounded-lg">
        {{ errorMsg }}
      </div>

      <UTable 
        :data="items" 
        :columns="columns" 
        :loading="pending"
        class="w-full"
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
          <span class="font-mono text-xs truncate max-w-[150px] inline-block" :title="(row.original as any).hash">
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
            class="w-5 h-5 text-gray-400" 
            title="Not Uploaded"
          />
        </template>
        
        <template #status-cell="{ row }">
           <div v-if="(row.original as any).duplicate_count > 0" class="flex flex-col gap-1 items-start">
            <UBadge color="error" variant="soft">Duplicate</UBadge>
            <span class="text-xs text-gray-500 max-w-[200px] truncate" :title="'Matches: ' + (row.original as any).duplicate_with">
              Matches: {{ (row.original as any).duplicate_with }}
            </span>
          </div>
          <UBadge v-else color="success" variant="soft">Unique</UBadge>
        </template>
      </UTable>

      <div class="flex justify-end px-3 py-3.5 border-t border-gray-200 dark:border-gray-700">
        <UPagination 
          v-model:page="page" 
          :items-per-page="50" 
          :total="total" 
        />
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center gap-2 text-error font-semibold">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" />
              Confirm Deletion
            </div>
          </template>

          <p>Are you sure you want to delete <strong>{{ selected.length }}</strong> file(s) from the list?</p>

          <div class="max-h-[200px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded bg-gray-50 dark:bg-gray-800/50 p-2 text-sm">
            <ul class="space-y-1">
              <li v-for="file in selected" :key="file.id" class="truncate flex items-center gap-2">
                <UIcon name="i-lucide-file" class="w-3 h-3 text-gray-400" />
                {{ file.filename }}
              </li>
            </ul>
          </div>

          <div class="pt-2">
            <UCheckbox 
              v-model="deleteFromDisk" 
              label="Delete files also from disk" 
              color="error"
            />
            <div v-if="deleteFromDisk" class="mt-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400">
              <UIcon name="i-lucide-alert-octagon" class="inline-block w-3 h-3 mr-1 mb-0.5" />
              <strong class="uppercase font-bold">Warning:</strong> This action cannot be undone. Clicking proceed will <strong>permanently delete</strong> the files from your storage device.
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">Cancel</UButton>
              <UButton 
                color="error" 
                :loading="isActioning"
                @click="performBulkAction('delete', true, deleteFromDisk)"
              >
                Proceed
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Scan Select Modal -->
    <UModal v-model:open="isScanSelectModalOpen">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-folder-search" class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-lg text-gray-900 dark:text-white">Select by Folder Scan</h3>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="isScanSelectModalOpen = false"
          />
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <!-- Path Input -->
          <div class="flex gap-2">
            <UInput
              v-model="scanSelectPath"
              placeholder="Enter folder path to scan..."
              icon="i-lucide-folder"
              class="flex-1"
              @keyup.enter="performScanSelect"
            />
            <UButton
              color="primary"
              :loading="isScanSelectLoading"
              @click="performScanSelect"
              :disabled="!scanSelectPath.trim()"
            >
              Scan
            </UButton>
          </div>

          <!-- Error -->
          <div v-if="scanSelectError" class="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg">
            {{ scanSelectError }}
          </div>

          <!-- Loading -->
          <div v-if="isScanSelectLoading" class="flex flex-col items-center justify-center py-8 gap-2">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
            <p class="text-sm text-gray-500">Scanning directory and matching files...</p>
          </div>

          <!-- Results -->
          <div v-else-if="scanSelectScannedCount > 0" class="space-y-3">
            <!-- Summary -->
            <div class="flex items-center justify-between text-sm">
              <p class="text-gray-500">
                Found <span class="font-semibold text-primary">{{ scanSelectResults.length }}</span>
                matching files out of
                <span class="font-semibold">{{ scanSelectScannedCount }}</span> scanned.
              </p>
              <div v-if="scanSelectResults.length > 0" class="flex items-center gap-3">
                <span v-if="scanSelectSelected.length" class="text-primary font-medium">
                  {{ scanSelectSelected.length }} selected
                </span>
                <UDropdownMenu v-if="scanSelectSelected.length" :items="scanSelectBulkActions">
                  <UButton
                    color="primary"
                    variant="solid"
                    size="sm"
                    trailing-icon="i-lucide-chevron-down"
                    :loading="isScanSelectActioning"
                  >
                    Actions
                  </UButton>
                </UDropdownMenu>
              </div>
            </div>

            <!-- No matches -->
            <div
              v-if="scanSelectResults.length === 0"
              class="text-center py-8 text-gray-500 border border-dashed rounded-lg"
            >
              <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No matching files found in the database.</p>
            </div>

            <!-- Results List -->
            <div
              v-else
              class="max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-800"
            >
              <!-- Select All Header -->
              <div class="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                <UCheckbox
                  :model-value="scanSelectSelected.length > 0 && scanSelectSelected.length === scanSelectResults.length"
                  :indeterminate="scanSelectSelected.length > 0 && scanSelectSelected.length < scanSelectResults.length"
                  @update:model-value="(val) => scanSelectSelected = val ? [...scanSelectResults] : []"
                />
                <span class="text-xs font-medium text-gray-500">Select All</span>
              </div>

              <!-- File Items -->
              <div
                v-for="file in scanSelectResults"
                :key="file.id"
                class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                @click="() => {
                  const idx = scanSelectSelected.findIndex((s: any) => s.id === file.id)
                  if (idx >= 0) scanSelectSelected.splice(idx, 1)
                  else scanSelectSelected.push(file)
                }"
              >
                <UCheckbox
                  :model-value="scanSelectSelected.some((s: any) => s.id === file.id)"
                  @click.stop
                  @update:model-value="(val) => {
                    if (val) scanSelectSelected.push(file)
                    else scanSelectSelected = scanSelectSelected.filter((s: any) => s.id !== file.id)
                  }"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{{ file.filename }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ file.filepath }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs text-gray-400">{{ formatSize(file.size) }}</span>
                  <UIcon
                    v-if="file.is_uploaded"
                    name="i-lucide-cloud-check"
                    class="w-4 h-4 text-success"
                    title="Uploaded"
                  />
                  <UBadge v-if="file.duplicate_count > 0" color="error" variant="soft" size="sm">Dup</UBadge>
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
        <UCard :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center gap-2 text-error font-semibold">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" />
              Confirm Deletion
            </div>
          </template>

          <p>Are you sure you want to delete <strong>{{ scanSelectSelected.length }}</strong> file(s) from the list?</p>

          <div class="max-h-[200px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded bg-gray-50 dark:bg-gray-800/50 p-2 text-sm">
            <ul class="space-y-1">
              <li v-for="file in scanSelectSelected" :key="file.id" class="truncate flex items-center gap-2">
                <UIcon name="i-lucide-file" class="w-3 h-3 text-gray-400" />
                {{ file.filename }}
              </li>
            </ul>
          </div>

          <div class="pt-2">
            <UCheckbox
              v-model="scanSelectDeleteFromDisk"
              label="Delete files also from disk"
              color="error"
            />
            <div v-if="scanSelectDeleteFromDisk" class="mt-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400">
              <UIcon name="i-lucide-alert-octagon" class="inline-block w-3 h-3 mr-1 mb-0.5" />
              <strong class="uppercase font-bold">Warning:</strong> This action cannot be undone. Clicking proceed will <strong>permanently delete</strong> the files from your storage device.
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="isScanSelectDeleteModalOpen = false">Cancel</UButton>
              <UButton
                color="error"
                :loading="isScanSelectActioning"
                @click="performScanSelectAction('delete', true, scanSelectDeleteFromDisk)"
              >
                Proceed
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </UContainer>
</template>
