<script setup lang="ts">
const { currentUser } = useAuth()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const saving = ref(false)
const message = ref('')
const isError = ref(false)

async function changePassword() {
  message.value = ''
  if (newPassword.value !== confirmPassword.value) {
    message.value = 'Passwords do not match'
    isError.value = true
    return
  }
  if (newPassword.value.length < 6) {
    message.value = 'Password must be at least 6 characters'
    isError.value = true
    return
  }
  saving.value = true
  try {
    await $fetch('/api/account/password', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      }
    })
    message.value = 'Password updated successfully'
    isError.value = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    message.value = err.data?.statusMessage || err.message || 'Failed to update password'
    isError.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Account">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-lg space-y-6">
        <p class="text-muted">
          Signed in as <strong>{{ currentUser?.username }}</strong>
        </p>

        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg text-primary">
                <UIcon
                  name="i-lucide-lock"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h2 class="text-lg font-semibold">
                  Change Password
                </h2>
              </div>
            </div>
          </template>

          <UAlert
            v-if="message"
            :color="isError ? 'error' : 'success'"
            variant="soft"
            :title="message"
            class="mb-4"
          />

          <form
            class="space-y-4"
            @submit.prevent="changePassword"
          >
            <UFormField
              label="Current Password"
              required
            >
              <UInput
                v-model="currentPassword"
                type="password"
                placeholder="Enter current password"
              />
            </UFormField>

            <UFormField
              label="New Password"
              required
            >
              <UInput
                v-model="newPassword"
                type="password"
                placeholder="Enter new password (min 6 chars)"
              />
            </UFormField>

            <UFormField
              label="Confirm New Password"
              required
            >
              <UInput
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm new password"
              />
            </UFormField>

            <UButton
              type="submit"
              color="primary"
              :loading="saving"
              :disabled="!currentPassword || !newPassword || !confirmPassword"
            >
              Update Password
            </UButton>
          </form>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
