<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ExplorerFile {
  id: number
  filename: string
  filepath: string
  size: number
  hash: string
  scanned_at: string
  is_uploaded: number
  duplicate_count: number
}

interface ExplorerResponse {
  currentPath: string
  folders: string[]
  files: ExplorerFile[]
}

const currentPath = ref('')
const pathInput = ref('')
const folders = ref<string[]>([])
const files = ref<ExplorerFile[]>([])
const isLoading = ref(false)
const errorMsg = ref('')

// Search & Sort
const searchQuery = ref('')
const sortMode = ref<'name_asc' | 'name_desc' | 'date_asc' | 'date_desc' | 'size_asc' | 'size_desc'>('name_asc')

const sortOptions = [
  { label: 'Name (Asc)', value: 'name_asc' },
  { label: 'Name (Desc)', value: 'name_desc' },
  { label: 'Date (Asc)', value: 'date_asc' },
  { label: 'Date (Desc)', value: 'date_desc' },
  { label: 'Size (Asc)', value: 'size_asc' },
  { label: 'Size (Desc)', value: 'size_desc' }
]

// File action modal
const isActionModalOpen = ref(false)
const actionFile = ref<ExplorerFile | null>(null)
const isActioning = ref(false)
const actionError = ref('')
const isDeleteConfirmOpen = ref(false)
const deleteFromDisk = ref(false)

// Filtered & sorted folders
const filteredFolders = computed(() => {
  let result = [...folders.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(f => f.toLowerCase().includes(q))
  }
  // Sort folders by name always
  result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return result
})

// Filtered & sorted files
const filteredFiles = computed(() => {
  let result = [...files.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(f => f.filename.toLowerCase().includes(q))
  }
  switch (sortMode.value) {
    case 'name_asc':
      result.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' }))
      break
    case 'name_desc':
      result.sort((a, b) => b.filename.localeCompare(a.filename, undefined, { sensitivity: 'base' }))
      break
    case 'size_asc':
      result.sort((a, b) => a.size - b.size)
      break
    case 'size_desc':
      result.sort((a, b) => b.size - a.size)
      break
    case 'date_asc':
      result.sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime())
      break
    case 'date_desc':
      result.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
      break
  }
  return result
})

// Breadcrumb segments
const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  const parts = currentPath.value.split('\\').filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  for (let i = 0; i < parts.length; i++) {
    const label = parts[i]
    if (!label) continue
    const path = parts.slice(0, i + 1).join('\\')
    crumbs.push({ label, path })
  }
  return crumbs
})

const isAtRoot = computed(() => !currentPath.value)

const fetchExplorer = async (path: string = '') => {
  isLoading.value = true
  errorMsg.value = ''
  searchQuery.value = ''

  try {
    const data = await $fetch<ExplorerResponse>('/api/explorer', {
      query: path ? { path } : {}
    })

    if (data) {
      currentPath.value = data.currentPath
      pathInput.value = data.currentPath
      folders.value = data.folders
      files.value = data.files
    }
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'Failed to load explorer data'
  } finally {
    isLoading.value = false
  }
}

const navigateTo = (path: string) => {
  fetchExplorer(path)
}

const navigateToFolder = (folderName: string) => {
  const newPath = currentPath.value ? `${currentPath.value}\\${folderName}` : folderName
  fetchExplorer(newPath)
}

const navigateUp = () => {
  if (!currentPath.value) return
  const parts = currentPath.value.split('\\').filter(Boolean)
  if (parts.length <= 1) {
    fetchExplorer('')
  } else {
    parts.pop()
    fetchExplorer(parts.join('\\'))
  }
}

const onPathSubmit = () => {
  const trimmed = pathInput.value.trim()
  fetchExplorer(trimmed)
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// File Actions
const openActionModal = (file: ExplorerFile) => {
  actionFile.value = file
  actionError.value = ''
  isActionModalOpen.value = true
}

const performAction = async (action: 'delete' | 'upload', value: boolean, fromDisk = false) => {
  if (!actionFile.value) return
  isActioning.value = true
  actionError.value = ''

  try {
    await $fetch('/api/files/action', {
      method: 'POST',
      body: {
        fileIds: [actionFile.value.id],
        action,
        value,
        deleteFromDisk: fromDisk
      }
    })

    // If marked as deleted, remove from local list
    if (action === 'delete' && value) {
      files.value = files.value.filter(f => f.id !== actionFile.value!.id)
    }
    // If toggled uploaded, update local state
    if (action === 'upload') {
      const f = files.value.find(f => f.id === actionFile.value!.id)
      if (f) f.is_uploaded = value ? 1 : 0
    }

    isActionModalOpen.value = false
    isDeleteConfirmOpen.value = false
    deleteFromDisk.value = false
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Action failed'
  } finally {
    isActioning.value = false
  }
}

const openDeleteConfirm = () => {
  isDeleteConfirmOpen.value = true
}

onMounted(() => {
  fetchExplorer('')
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
          Explorer
        </h1>
        <p class="text-gray-500">Browse your scanned files by folder structure</p>
      </div>
    </div>

    <!-- Navigation Bar -->
    <UCard>
      <div class="flex items-center gap-2">
        <!-- Back Button -->
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          :disabled="isAtRoot || isLoading"
          @click="navigateUp"
          title="Go back"
        />

        <!-- Home Button -->
        <UButton
          icon="i-lucide-hard-drive"
          color="neutral"
          variant="ghost"
          :disabled="isAtRoot || isLoading"
          @click="navigateTo('')"
          title="Go to root"
        />

        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <!-- Path Input -->
        <form @submit.prevent="onPathSubmit" class="flex-1 flex items-center gap-2">
          <UInput
            v-model="pathInput"
            icon="i-lucide-folder"
            placeholder="Enter a path..."
            class="flex-1"
            :disabled="isLoading"
            @keyup.enter="onPathSubmit"
          />
          <UButton
            type="submit"
            icon="i-lucide-arrow-right"
            color="primary"
            variant="soft"
            :disabled="isLoading"
            title="Go"
          />
        </form>
      </div>

      <!-- Breadcrumbs -->
      <div v-if="breadcrumbs.length" class="flex items-center gap-1 mt-3 text-sm flex-wrap">
        <button
          class="text-primary hover:underline font-medium cursor-pointer"
          @click="navigateTo('')"
        >
          <UIcon name="i-lucide-monitor" class="w-4 h-4 inline-block mb-0.5" />
          This PC
        </button>
        <template v-for="(crumb, i) in breadcrumbs" :key="i">
          <UIcon name="i-lucide-chevron-right" class="w-3 h-3 text-gray-400 shrink-0" />
          <button
            class="hover:underline cursor-pointer truncate max-w-[200px]"
            :class="i === breadcrumbs.length - 1
              ? 'font-semibold text-gray-900 dark:text-white'
              : 'text-primary font-medium'"
            @click="navigateTo(crumb.path)"
            :title="crumb.path"
          >
            {{ crumb.label }}
          </button>
        </template>
      </div>
    </UCard>

    <!-- Toolbar: Search + Sort (shown when not at root and not loading) -->
    <div v-if="!isAtRoot && !isLoading" class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Filter files and folders..."
        class="w-full sm:w-72"
      />
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-arrow-up-down" class="w-4 h-4 text-gray-400" />
        <USelect
          v-model="sortMode"
          :items="sortOptions"
          value-key="value"
          class="w-40"
        />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="errorMsg" class="p-4 text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg flex items-center gap-2">
      <UIcon name="i-lucide-alert-circle" class="w-5 h-5 shrink-0" />
      {{ errorMsg }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16 gap-3">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      <p class="text-gray-500 text-sm">Loading...</p>
    </div>

    <!-- Content -->
    <div v-else-if="!errorMsg">
      <!-- Root: Volumes View -->
      <div v-if="isAtRoot && folders.length > 0">
        <p class="text-sm text-gray-500 mb-4 font-medium">Volumes</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            v-for="vol in folders"
            :key="vol"
            class="group flex flex-col items-center gap-3 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
            @click="navigateTo(vol)"
          >
            <div class="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
              <UIcon name="i-lucide-hard-drive" class="w-8 h-8" />
            </div>
            <span class="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">
              {{ vol }}\
            </span>
          </button>
        </div>
      </div>

      <!-- Folder & Files View -->
      <div v-else-if="!isAtRoot">
        <!-- Folders -->
        <div v-if="filteredFolders.length > 0" class="mb-6">
          <p class="text-sm text-gray-500 mb-3 font-medium">
            Folders
            <span class="text-gray-400">({{ filteredFolders.length }})</span>
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              v-for="folder in filteredFolders"
              :key="folder"
              class="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer text-left"
              @click="navigateToFolder(folder)"
              :title="folder"
            >
              <div class="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-primary/15 group-hover:text-primary transition-colors shrink-0">
                <UIcon name="i-lucide-folder" class="w-5 h-5" />
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-primary transition-colors">
                {{ folder }}
              </span>
            </button>
          </div>
        </div>

        <!-- Files -->
        <div v-if="filteredFiles.length > 0">
          <p class="text-sm text-gray-500 mb-3 font-medium">
            Files
            <span class="text-gray-400">({{ filteredFiles.length }})</span>
          </p>
          <div class="space-y-1">
            <div
              v-for="file in filteredFiles"
              :key="file.id"
              class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <div class="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 shrink-0">
                <UIcon name="i-lucide-file" class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" :title="file.filename">
                  {{ file.filename }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <UIcon
                  v-if="file.is_uploaded"
                  name="i-lucide-cloud-check"
                  class="w-4 h-4 text-success"
                  title="Uploaded"
                />
                <UBadge v-if="file.duplicate_count > 0" color="error" variant="soft" size="sm">Dup</UBadge>
                <span class="text-xs text-gray-400 w-20 text-right">{{ formatSize(file.size) }}</span>
                <!-- Action Button -->
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openActionModal(file)"
                  title="Actions"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State (after filter) -->
        <div
          v-if="filteredFolders.length === 0 && filteredFiles.length === 0"
          class="flex flex-col items-center justify-center py-16 text-gray-400"
        >
          <UIcon :name="searchQuery ? 'i-lucide-search-x' : 'i-lucide-folder-x'" class="w-12 h-12 mb-3 opacity-50" />
          <p class="font-medium text-gray-500">
            {{ searchQuery ? 'No matching files or folders' : 'No files found at this path' }}
          </p>
          <p class="text-sm mt-1">
            {{ searchQuery ? 'Try a different search term' : 'Try navigating to a different folder or scanning this directory first' }}
          </p>
        </div>
      </div>

      <!-- Root Empty State -->
      <div
        v-else-if="isAtRoot && folders.length === 0"
        class="flex flex-col items-center justify-center py-16 text-gray-400"
      >
        <UIcon name="i-lucide-database" class="w-12 h-12 mb-3 opacity-50" />
        <p class="font-medium text-gray-500">No files in database</p>
        <p class="text-sm mt-1 mb-4">Start by scanning a directory to populate the explorer</p>
        <UButton to="/scan" icon="i-lucide-search" color="primary">New Scan</UButton>
      </div>
    </div>

    <!-- File Action Modal -->
    <UModal v-model:open="isActionModalOpen">
      <template #content>
        <UCard v-if="actionFile">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                <UIcon name="i-lucide-file" class="w-5 h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-gray-900 dark:text-white truncate">{{ actionFile.filename }}</h3>
                <p class="text-xs text-gray-500 truncate" :title="actionFile.filepath">{{ actionFile.filepath }}</p>
              </div>
            </div>
          </template>

          <!-- File Details -->
          <div class="space-y-3 mb-5">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Size</span>
              <span class="font-medium">{{ formatSize(actionFile.size) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Hash</span>
              <span class="font-mono text-xs truncate max-w-[200px]" :title="actionFile.hash">
                {{ actionFile.hash.substring(0, 24) }}...
              </span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Upload Status</span>
              <UBadge :color="actionFile.is_uploaded ? 'success' : 'neutral'" variant="soft" size="sm">
                {{ actionFile.is_uploaded ? 'Uploaded' : 'Not Uploaded' }}
              </UBadge>
            </div>
            <div v-if="actionFile.duplicate_count > 0" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Duplicates</span>
              <UBadge color="error" variant="soft" size="sm">{{ actionFile.duplicate_count }} duplicate(s)</UBadge>
            </div>
          </div>

          <!-- Action Error -->
          <div v-if="actionError" class="p-3 mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg">
            {{ actionError }}
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <UButton
              v-if="!actionFile.is_uploaded"
              block
              color="primary"
              variant="soft"
              icon="i-lucide-cloud-upload"
              :loading="isActioning"
              @click="performAction('upload', true)"
            >
              Mark as Uploaded
            </UButton>
            <UButton
              v-else
              block
              color="neutral"
              variant="soft"
              icon="i-lucide-cloud-off"
              :loading="isActioning"
              @click="performAction('upload', false)"
            >
              Remove Uploaded Mark
            </UButton>
            <UButton
              block
              color="error"
              variant="soft"
              icon="i-lucide-trash-2"
              :loading="isActioning"
              @click="openDeleteConfirm"
            >
              Mark as Deleted (Hide)
            </UButton>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton color="neutral" variant="ghost" @click="isActionModalOpen = false">Close</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteConfirmOpen">
      <template #content>
        <UCard v-if="actionFile" :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center gap-2 text-error font-semibold">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" />
              Confirm Deletion
            </div>
          </template>

          <p>Are you sure you want to delete <strong>{{ actionFile.filename }}</strong> from the list?</p>

          <div class="pt-2">
            <UCheckbox
              v-model="deleteFromDisk"
              label="Delete file also from disk"
              color="error"
            />
            <div v-if="deleteFromDisk" class="mt-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400">
              <UIcon name="i-lucide-alert-octagon" class="inline-block w-3 h-3 mr-1 mb-0.5" />
              <strong class="uppercase font-bold">Warning:</strong> This action cannot be undone. Clicking proceed will <strong>permanently delete</strong> the file from your storage device.
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="isDeleteConfirmOpen = false">Cancel</UButton>
              <UButton
                color="error"
                :loading="isActioning"
                @click="performAction('delete', true, deleteFromDisk)"
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
