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
  </UContainer>
</template>
