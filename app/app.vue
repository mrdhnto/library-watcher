<script setup lang="ts">
useHead({
  title: 'Library Watcher',
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
@media (max-width: 1023px) {
  #__nuxt {
    padding-bottom: 3.5rem;
  }
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
