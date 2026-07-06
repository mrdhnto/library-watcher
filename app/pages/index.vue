<script setup lang="ts">
const stats = ref({
  totalFiles: 0,
  totalSize: 0,
  totalDuplicates: 0,
  duplicateSize: 0,
  totalUploaded: 0,
  uploadedSize: 0
})

const heatmap = ref<{ formats: { extension: string, count: number, totalSize: number }[], totalFiles: number, totalSize: number }>({
  formats: [],
  totalFiles: 0,
  totalSize: 0
})

const isLoadingStats = ref(true)
const isLoadingHeatmap = ref(true)

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const topFormats = computed(() => heatmap.value.formats.slice(0, 12))

const maxCount = computed(() => {
  if (topFormats.value.length === 0) return 1
  return topFormats.value[0]?.count || 1
})

const formatColors: Record<string, string> = {
  '.mp4': 'bg-red-500',
  '.mkv': 'bg-red-600',
  '.avi': 'bg-orange-500',
  '.mov': 'bg-orange-600',
  '.wmv': 'bg-amber-500',
  '.flv': 'bg-yellow-500',
  '.webm': 'bg-yellow-600',
  '.png': 'bg-blue-500',
  '.jpg': 'bg-blue-600',
  '.jpeg': 'bg-blue-600',
  '.gif': 'bg-sky-500',
  '.webp': 'bg-cyan-500',
  '.svg': 'bg-teal-500',
  '.bmp': 'bg-emerald-500',
  '.tiff': 'bg-green-500',
  '.mp3': 'bg-purple-500',
  '.wav': 'bg-purple-600',
  '.flac': 'bg-fuchsia-500',
  '.aac': 'bg-pink-500',
  '.ogg': 'bg-rose-500',
  '.wma': 'bg-red-400',
  '.pdf': 'bg-red-700',
  '.doc': 'bg-blue-700',
  '.docx': 'bg-blue-700',
  '.xls': 'bg-green-700',
  '.xlsx': 'bg-green-700',
  '.ppt': 'bg-orange-700',
  '.pptx': 'bg-orange-700',
  '.txt': 'bg-gray-500',
  '.zip': 'bg-amber-700',
  '.rar': 'bg-amber-800',
  '.7z': 'bg-yellow-700',
  '.tar': 'bg-brown-500',
  '.gz': 'bg-stone-500',
  '.exe': 'bg-slate-600',
  '.dll': 'bg-slate-500',
  '.iso': 'bg-zinc-600',
  '.dmg': 'bg-zinc-500',
  '.ttf': 'bg-indigo-500',
  '.otf': 'bg-indigo-600',
  '.woff': 'bg-violet-500',
  '.json': 'bg-lime-600',
  '.xml': 'bg-lime-500',
  '.yml': 'bg-lime-500',
  '.yaml': 'bg-lime-500',
  '.md': 'bg-neutral-500',
  '.py': 'bg-yellow-600',
  '.js': 'bg-yellow-500',
  '.ts': 'bg-blue-500',
  '.html': 'bg-orange-500',
  '.css': 'bg-sky-500'
}

function getBarColor(ext: string): string {
  return formatColors[ext] || 'bg-primary'
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/stats/my')
    if (data) stats.value = data as any
  } catch {
    //
  } finally {
    isLoadingStats.value = false
  }

  try {
    const data = await $fetch('/api/stats/heatmap')
    if (data) heatmap.value = data as any
  } catch {
    //
  } finally {
    isLoadingHeatmap.value = false
  }
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/scan"
            icon="i-lucide-search"
            color="primary"
          >
            New Scan
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-8">
        <!-- Stats Cards -->
        <div
          v-if="isLoadingStats"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <UCard
            v-for="i in 5"
            :key="i"
          >
            <USkeleton class="h-12 w-full" />
          </UCard>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-primary/10 rounded-lg text-primary">
                <UIcon
                  name="i-lucide-files"
                  class="w-6 h-6"
                />
              </div>
              <div>
                <p class="text-sm text-muted font-medium">
                  Total Files
                </p>
                <p class="text-2xl font-bold">
                  {{ stats.totalFiles }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-green-500/10 rounded-lg text-green-500">
                <UIcon
                  name="i-lucide-hard-drive"
                  class="w-6 h-6"
                />
              </div>
              <div>
                <p class="text-sm text-muted font-medium">
                  Total Size
                </p>
                <p class="text-2xl font-bold">
                  {{ formatSize(stats.totalSize) }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                <UIcon
                  name="i-lucide-cloud-upload"
                  class="w-6 h-6"
                />
              </div>
              <div>
                <p class="text-sm text-muted font-medium">
                  Uploaded
                </p>
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-bold">{{ stats.totalUploaded }}</span>
                  <span class="text-xs text-dimmed">({{ formatSize(stats.uploadedSize) }})</span>
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-red-500/10 rounded-lg text-red-500">
                <UIcon
                  name="i-lucide-copy"
                  class="w-6 h-6"
                />
              </div>
              <div>
                <p class="text-sm text-muted font-medium">
                  Duplicates
                </p>
                <p class="text-2xl font-bold text-error">
                  {{ stats.totalDuplicates }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                <UIcon
                  name="i-lucide-trash-2"
                  class="w-6 h-6"
                />
              </div>
              <div>
                <p class="text-sm text-muted font-medium">
                  Wasted Space
                </p>
                <p class="text-2xl font-bold">
                  {{ formatSize(stats.duplicateSize) }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- File Format Heatmap -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg text-primary">
                <UIcon
                  name="i-lucide-pie-chart"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h2 class="text-lg font-semibold">
                  File Format Distribution
                </h2>
                <p class="text-sm text-muted">
                  Top file types by count across {{ heatmap.totalFiles }} indexed files
                </p>
              </div>
            </div>
          </template>

          <div
            v-if="isLoadingHeatmap"
            class="space-y-3"
          >
            <USkeleton
              v-for="i in 6"
              :key="i"
              class="h-10 w-full"
            />
          </div>

          <div
            v-else-if="heatmap.formats.length === 0"
            class="text-center py-12 text-muted"
          >
            <UIcon
              name="i-lucide-bar-chart"
              class="w-12 h-12 mx-auto mb-4 opacity-50"
            />
            <p>No file format data yet.</p>
            <p class="text-sm text-dimmed">
              Run a scan to see file format distribution.
            </p>
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <div
              v-for="fmt in topFormats"
              :key="fmt.extension"
              class="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <span class="w-16 text-sm font-mono font-medium text-toned text-right shrink-0">
                {{ fmt.extension }}
              </span>
              <div class="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="getBarColor(fmt.extension)"
                  :style="{ width: `${(fmt.count / maxCount) * 100}%` }"
                />
              </div>
              <span class="w-24 text-sm font-mono text-right text-toned shrink-0">
                {{ fmt.count.toLocaleString() }}
              </span>
              <span class="w-24 text-sm text-right text-dimmed shrink-0 hidden sm:block">
                {{ formatSize(fmt.totalSize) }}
              </span>
            </div>

            <div
              v-if="heatmap.formats.length > 12"
              class="text-center pt-2"
            >
              <span class="text-sm text-dimmed">
                +{{ heatmap.formats.length - 12 }} more formats
              </span>
            </div>
          </div>
        </UCard>

        <!-- Quick Actions -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <UButton
            to="/files"
            size="lg"
            variant="soft"
            icon="i-lucide-folder-open"
            class="justify-center"
          >
            View Files
          </UButton>
          <UButton
            to="/search"
            size="lg"
            variant="soft"
            icon="i-lucide-search"
            class="justify-center"
          >
            Search
          </UButton>
          <UButton
            to="/queue"
            size="lg"
            variant="soft"
            icon="i-lucide-list-todo"
            class="justify-center"
          >
            Queue
          </UButton>
          <UButton
            to="/clients"
            size="lg"
            variant="soft"
            icon="i-lucide-monitor"
            class="justify-center"
          >
            Clients
          </UButton>
          <UButton
            to="/scan"
            size="lg"
            variant="outline"
            color="primary"
            icon="i-lucide-search"
            class="justify-center"
          >
            New Scan
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
