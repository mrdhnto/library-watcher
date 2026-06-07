<script setup lang="ts">
import { computed } from 'vue'

useHead({
  title: 'Library Watcher',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const links = computed(() => [{
  label: 'Dashboard',
  icon: 'i-lucide-layout-dashboard',
  to: '/'
}, {
  label: 'Files',
  icon: 'i-lucide-files',
  to: '/files'
}, {
  label: 'Queue',
  icon: 'i-lucide-list-todo',
  to: '/queue'
}, {
  label: 'Scan',
  icon: 'i-lucide-search',
  to: '/scan'
}, {
  label: 'Clients',
  icon: 'i-lucide-monitor',
  to: '/clients'
}])
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-xl">
          <UIcon name="i-lucide-library" class="w-6 h-6 text-primary" />
          Library Watcher
        </NuxtLink>
      </template>

      <template #center>
        <UNavigationMenu :items="links" />
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain class="min-h-[calc(100vh-140px)]">
      <NuxtPage />
    </UMain>

    <USeparator />

    <UFooter>
      <template #left>
        <p class="text-sm text-gray-500">
          Library Watcher • Server-side file hashing and deduplication
        </p>
      </template>
    </UFooter>
  </UApp>
</template>


