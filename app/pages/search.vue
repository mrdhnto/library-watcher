<script setup lang="ts">
import { ref, computed } from 'vue'

interface SearchResult {
  id: number
  filename: string
  filepath: string
  size: number
  hash: string
  scanned_at: string
  is_uploaded: number
  duplicate_count: number
}

interface SearchResponse {
  items: SearchResult[]
  total: number
  page: number
  limit: number
  query: string
}

const searchQuery = ref('')
const results = ref<SearchResult[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const hasSearched = ref(false)
const limit = 50

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const totalPages = computed(() => Math.ceil(total.value / limit))

const doSearch = async (resetPage = true) => {
  const q = searchQuery.value.trim()
  if (!q) return

  if (resetPage) page.value = 1
  isLoading.value = true
  hasSearched.value = true

  try {
    const data = await $fetch<SearchResponse>('/api/search', {
      query: { q, page: page.value, limit }
    })
    results.value = data.items
    total.value = data.total
  } catch {
    results.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

const onPageChange = (p: number) => {
  page.value = p
  doSearch(false)
}
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
        Search
      </h1>
      <p class="text-gray-500">Search across your entire file library</p>
    </div>

    <!-- Search Input -->
    <form @submit.prevent="doSearch()" class="flex gap-2">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Search by filename, path, or hash..."
        class="flex-1"
        size="lg"
      />
      <UButton
        type="submit"
        icon="i-lucide-arrow-right"
        color="primary"
        size="lg"
        :loading="isLoading"
        :disabled="!searchQuery.trim()"
      >
        Search
      </UButton>
    </form>

    <!-- Results -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="hasSearched">
      <!-- Summary -->
      <p v-if="results.length > 0" class="text-sm text-gray-500">
        Found <span class="font-semibold text-primary">{{ total }}</span> result(s) for "{{ searchQuery }}"
      </p>
      <p v-else class="text-center py-16 text-gray-400">
        <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        No results found for "{{ searchQuery }}"
      </p>

      <!-- Results List -->
      <div v-if="results.length > 0" class="space-y-1 mt-4">
        <div
          v-for="file in results"
          :key="file.id"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        >
          <div class="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 shrink-0">
            <UIcon :name="fileTypeIcon(file.filename)" class="w-4 h-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" :title="file.filename">
              {{ file.filename }}
            </p>
            <p class="text-xs text-gray-400 truncate" :title="file.filepath">{{ file.filepath }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UIcon
              v-if="file.is_uploaded"
              name="i-lucide-cloud-check"
              class="w-4 h-4 text-success"
              title="Uploaded"
            />
            <UBadge v-if="file.duplicate_count > 0" color="error" variant="soft" size="sm">
              Dup ({{ file.duplicate_count }})
            </UBadge>
            <span class="text-xs text-gray-400 w-20 text-right">{{ formatSize(file.size) }}</span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center pt-6">
        <UPagination v-model:page="page" :total="total" :items-per-page="limit" @update:page="onPageChange" />
      </div>
    </div>

    <!-- Initial state -->
    <div v-else class="text-center py-16 text-gray-400">
      <UIcon name="i-lucide-search" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="font-medium">Search your file library</p>
      <p class="text-sm mt-1">Enter a filename, filepath, or hash to find files across all scanned directories</p>
    </div>
  </UContainer>
</template>
