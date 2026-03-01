<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const targetDir = ref('')
const isDispatching = ref(false)
const errorMsg = ref('')

const startScanJob = async () => {
  if (!targetDir.value) {
    errorMsg.value = 'Please enter a target directory path'
    return
  }
  
  errorMsg.value = ''
  isDispatching.value = true

  try {
    const response = await $fetch('/api/scan', {
      method: 'POST',
      body: { path: targetDir.value }
    })
    
    // Redirect to queue immediately after task successfully dispatched
    if (response) {
      router.push('/queue')
    }
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'An error occurred while starting the scan'
    isDispatching.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-2xl mx-auto space-y-8">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary/10 rounded-lg text-primary">
            <UIcon name="i-lucide-folder-search" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-xl font-bold">New Scan</h2>
            <p class="text-gray-500 text-sm">Add a folder to the background scanning queue</p>
          </div>
        </div>
      </template>

      <form @submit.prevent="startScanJob" class="space-y-6">
        <UFormGroup 
          label="Target Directory Path" 
          description="Enter an absolute path to a local folder"
          :error="errorMsg"
        >
          <UInput 
            v-model="targetDir" 
            placeholder="e.g. D:\MyFiles or /Users/name/Documents" 
            icon="i-lucide-folder"
            size="lg"
            :disabled="isDispatching"
          />
        </UFormGroup>

        <div class="flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" to="/">Cancel</UButton>
          <UButton 
            type="submit" 
            :loading="isDispatching"
            size="lg"
            icon="i-lucide-play"
          >
            Start Scan Job
          </UButton>
        </div>
      </form>
    </UCard>
    
    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-blue-800 dark:text-blue-300">
      <UIcon name="i-lucide-info" class="w-5 h-5 shrink-0 mt-0.5" />
      <div class="text-sm">
        <p class="font-semibold mb-1">Background Scanning</p>
        <p>Scanning large directories and calculating SHA-256 hashes can take significant time. The process will run in the background, and you will be redirected to the Queue page to monitor its progress.</p>
      </div>
    </div>
  </UContainer>
</template>
