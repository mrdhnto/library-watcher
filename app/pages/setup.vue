<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({ layout: 'login' })

const router = useRouter()
const { setup, checkAuth } = useAuth()

const step = ref(1)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const passwordHint = ref('')
const error = ref('')
const isSubmitting = ref(false)

onMounted(async () => {
  const status = await checkAuth()
  if (status !== 'setup-needed') {
    router.push('/')
  }
})

async function handleSetup() {
  error.value = ''

  if (!username.value.trim() || username.value.trim().length < 2) {
    error.value = 'Username must be at least 2 characters'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  isSubmitting.value = true
  try {
    await setup(username.value.trim(), password.value, passwordHint.value.trim())
    await checkAuth()
    router.push('/')
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Setup failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer class="min-h-screen flex items-center justify-center py-12">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center space-y-2">
          <UIcon
            name="i-lucide-library"
            class="w-10 h-10 text-primary mx-auto"
          />
          <h1 class="text-2xl font-bold">
            Set Up Library Watcher
          </h1>
          <p class="text-sm text-muted">
            Create your admin account to get started
          </p>
        </div>
      </template>

      <div class="flex items-center justify-center gap-4 mb-6">
        <div class="flex items-center gap-2">
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors', step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-green-500 text-white' : 'bg-muted text-dimmed']">
            1
          </div>
          <div>
            <p class="text-sm font-medium">
              Account
            </p>
            <p class="text-xs text-dimmed">
              Create credentials
            </p>
          </div>
        </div>
        <div class="w-12 h-px bg-muted" />
        <div class="flex items-center gap-2">
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors', step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-green-500 text-white' : 'bg-muted text-dimmed']">
            2
          </div>
          <div>
            <p class="text-sm font-medium">
              Confirm
            </p>
            <p class="text-xs text-dimmed">
              Review and finish
            </p>
          </div>
        </div>
      </div>

      <form
        v-if="step === 1"
        class="space-y-4"
        @submit.prevent="step = 2"
      >
        <UFormField
          label="Username"
          required
        >
          <UInput
            v-model="username"
            placeholder="admin"
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
            placeholder="At least 6 characters"
            icon="i-lucide-lock"
            class="w-full"
            autocomplete="new-password"
          />
        </UFormField>

        <UFormField
          label="Confirm Password"
          required
        >
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            icon="i-lucide-lock"
            class="w-full"
            autocomplete="new-password"
          />
        </UFormField>

        <UFormField label="Password Hint (optional)">
          <UInput
            v-model="passwordHint"
            placeholder="e.g. My birthday year + pet name"
            icon="i-lucide-help-circle"
            class="w-full"
          />
          <p class="text-xs text-dimmed mt-1">
            Helps you remember your password if you forget it
          </p>
        </UFormField>

        <div class="flex justify-end pt-2">
          <UButton
            type="submit"
            color="primary"
          >
            Continue
          </UButton>
        </div>
      </form>

      <div
        v-else
        class="space-y-4"
      >
        <div class="bg-muted rounded-lg p-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Username</span>
            <span class="font-medium">{{ username }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Password</span>
            <span class="font-medium">••••••••</span>
          </div>
          <div
            v-if="passwordHint"
            class="flex justify-between"
          >
            <span class="text-muted">Hint</span>
            <span class="font-medium">{{ passwordHint }}</span>
          </div>
        </div>

        <div class="bg-info/10 p-3 rounded text-sm text-info flex gap-2">
          <UIcon
            name="i-lucide-info"
            class="w-4 h-4 shrink-0 mt-0.5"
          />
          <span>This is the only admin account. Store your password safely — you'll need it to manage users, clients, and settings.</span>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          icon="i-lucide-alert-circle"
        />

        <div class="flex justify-between pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="step = 1"
          >
            Back
          </UButton>
          <UButton
            color="primary"
            :loading="isSubmitting"
            @click="handleSetup"
          >
            Complete Setup
          </UButton>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
