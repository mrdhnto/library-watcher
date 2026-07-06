<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({ layout: 'login' })

const router = useRouter()
const { login, checkAuth } = useAuth()

const username = ref('')
const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

onMounted(async () => {
  const status = await checkAuth()
  if (status === 'authenticated') {
    router.push('/')
  }
  if (status === 'setup-needed') {
    router.push('/setup')
  }
})

async function handleLogin() {
  error.value = ''

  if (!username.value.trim() || !password.value) {
    error.value = 'Please enter your username and password'
    return
  }

  isSubmitting.value = true
  try {
    await login(username.value.trim(), password.value)
    router.push('/')
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Invalid credentials'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer class="min-h-screen flex items-center justify-center py-12">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center space-y-2">
          <UIcon
            name="i-lucide-library"
            class="w-10 h-10 text-primary mx-auto"
          />
          <h1 class="text-2xl font-bold">
            Library Watcher
          </h1>
          <p class="text-sm text-muted">
            Sign in to continue
          </p>
        </div>
      </template>

      <form
        class="space-y-4"
        @submit.prevent="handleLogin"
      >
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          icon="i-lucide-alert-circle"
        />

        <UFormField
          label="Username"
          required
        >
          <UInput
            v-model="username"
            placeholder="Enter your username"
            icon="i-lucide-user"
            class="w-full"
            autocomplete="username"
          />
        </UFormField>

        <UFormField
          label="Password"
          required
        >
          <UInput
            v-model="password"
            type="password"
            placeholder="Enter your password"
            icon="i-lucide-lock"
            class="w-full"
            autocomplete="current-password"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          class="w-full"
          :loading="isSubmitting"
        >
          Sign In
        </UButton>
      </form>
    </UCard>
  </UContainer>
</template>
