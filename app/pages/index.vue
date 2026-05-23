<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  totalFiles: 0,
  totalSize: 0,
  totalDuplicates: 0,
  duplicateSize: 0,
  totalUploaded: 0,
  uploadedSize: 0
})

const isLoading = ref(true)

const fetchStats = async () => {
  try {
    const data = await $fetch('/api/stats')
    // @ts-ignore
    if (data) stats.value = data
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    isLoading.value = false
  }
}

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <UContainer class="py-8 space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Dashboard</h1>
        <p class="text-gray-500">Overview of your scanned library</p>
      </div>
      <UButton to="/scan" icon="i-lucide-search" color="primary">New Scan</UButton>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-primary/10 rounded-lg text-primary">
            <UIcon name="i-lucide-files" class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Files</p>
            <p class="text-2xl font-bold">{{ stats.totalFiles }}</p>
          </div>
        </div>
      </UCard>
      
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-500/10 rounded-lg text-green-500">
            <UIcon name="i-lucide-hard-drive" class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Size</p>
            <p class="text-2xl font-bold">{{ formatSize(stats.totalSize) }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-500/10 rounded-lg text-blue-500">
            <UIcon name="i-lucide-cloud-upload" class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Uploaded</p>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-bold">{{ stats.totalUploaded }}</span>
              <span class="text-xs text-gray-400">({{ formatSize(stats.uploadedSize) }})</span>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-red-500/10 rounded-lg text-red-500">
            <UIcon name="i-lucide-copy" class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Duplicates</p>
            <p class="text-2xl font-bold text-error">{{ stats.totalDuplicates }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-orange-500/10 rounded-lg text-orange-500">
            <UIcon name="i-lucide-trash-2" class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Wasted Space</p>
            <p class="text-2xl font-bold">{{ formatSize(stats.duplicateSize) }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="mt-8 flex justify-center gap-4">
      <UButton
        to="/files"
        size="lg"
        variant="soft"
        icon="i-lucide-folder-open"
        class="flex-1 max-w-xs justify-center"
      >
        View All Files
      </UButton>
      <UButton
        to="/explorer"
        size="lg"
        variant="soft"
        icon="i-lucide-list-todo"
        class="flex-1 max-w-xs justify-center"
      >
        Explorer Mode
      </UButton>
      <UButton
        to="/search"
        size="lg"
        variant="soft"
        icon="i-lucide-search"
        class="flex-1 max-w-xs justify-center"
      >
        Search
      </UButton>
      <UButton
        to="/queue"
        size="lg"
        variant="outline"
        icon="i-lucide-list-todo"
        class="flex-1 max-w-xs justify-center"
      >
        Scan Queue
      </UButton>
    </div>
  </UContainer>
</template>
