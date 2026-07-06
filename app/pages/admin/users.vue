<script setup lang="ts">
import { ref, onMounted } from 'vue'

const toast = useToast()
const { isAdmin } = useAuth()

const users = ref<any[]>([])
const loading = ref(false)

const createModalOpen = ref(false)
const createUsername = ref('')
const createPassword = ref('')
const createPasswordHint = ref('')
const createRole = ref<'user' | 'admin'>('user')
const isCreating = ref(false)

const resetModalOpen = ref(false)
const resetTarget = ref<any>(null)
const resetPassword = ref('')
const isResetting = ref(false)

const confirmDeleteOpen = ref(false)
const deleteTarget = ref<any>(null)
const isDeleting = ref(false)

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await $fetch('/api/admin/users') as any[]
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isAdmin.value) fetchUsers()
})

async function handleCreate() {
  if (createUsername.value.trim().length < 2) {
    toast.add({ title: 'Username must be at least 2 characters', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  if (createPassword.value.length < 6) {
    toast.add({ title: 'Password must be at least 6 characters', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }

  isCreating.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        username: createUsername.value.trim(),
        password: createPassword.value,
        passwordHint: createPasswordHint.value.trim() || undefined,
        role: createRole.value
      }
    })
    createModalOpen.value = false
    createUsername.value = ''
    createPassword.value = ''
    createPasswordHint.value = ''
    createRole.value = 'user'
    toast.add({ title: 'User created successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchUsers()
  } catch (err: any) {
    toast.add({ title: err.data?.statusMessage || err.message || 'Failed to create user', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    isCreating.value = false
  }
}

function openReset(user: any) {
  resetTarget.value = user
  resetPassword.value = ''
  resetModalOpen.value = true
}

async function handleReset() {
  if (resetPassword.value.length < 6) {
    toast.add({ title: 'Password must be at least 6 characters', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }

  isResetting.value = true
  try {
    await $fetch(`/api/admin/users/${resetTarget.value.id}/reset-password`, {
      method: 'POST',
      body: { password: resetPassword.value }
    })
    resetModalOpen.value = false
    toast.add({ title: 'Password reset successfully', color: 'success', icon: 'i-lucide-check-circle' })
    fetchUsers()
  } catch (err: any) {
    toast.add({ title: err.data?.statusMessage || err.message || 'Failed to reset password', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    isResetting.value = false
  }
}

async function toggleActive(user: any) {
  try {
    const endpoint = user.is_active ? 'deactivate' : 'activate'
    await $fetch(`/api/admin/users/${user.id}/${endpoint}`, { method: 'POST' })
    toast.add({ title: user.is_active ? 'User deactivated' : 'User activated', color: 'success', icon: 'i-lucide-check-circle' })
    fetchUsers()
  } catch {
    //
  }
}

function confirmDelete(user: any) {
  deleteTarget.value = user
  confirmDeleteOpen.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/admin/users/${deleteTarget.value.id}`, { method: 'DELETE' })
    confirmDeleteOpen.value = false
    deleteTarget.value = null
    toast.add({ title: 'User deleted', color: 'success', icon: 'i-lucide-check-circle' })
    fetchUsers()
  } catch {
    //
  } finally {
    isDeleting.value = false
  }
}

function getStatusColor(active: number) {
  return active ? 'success' as const : 'neutral' as const
}

const promoteModalOpen = ref(false)
const promoteTarget = ref<any>(null)
const promoteUsername = ref('')
const promotePassword = ref('')
const promoteLoading = ref(false)

function openPromote(user: any) {
  promoteTarget.value = user
  promoteUsername.value = ''
  promotePassword.value = ''
  promoteModalOpen.value = true
}

async function handlePromote() {
  if (promoteUsername.value.trim().length < 2) {
    toast.add({ title: 'Username must be at least 2 characters', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  if (promotePassword.value.length < 6) {
    toast.add({ title: 'Password must be at least 6 characters', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  promoteLoading.value = true
  try {
    await $fetch(`/api/admin/users/${promoteTarget.value.id}/promote`, {
      method: 'POST',
      body: { username: promoteUsername.value.trim(), password: promotePassword.value }
    })
    promoteModalOpen.value = false
    toast.add({ title: 'User promoted to permanent', color: 'success', icon: 'i-lucide-check-circle' })
    fetchUsers()
  } catch (err: any) {
    toast.add({ title: err.data?.statusMessage || err.message || 'Failed to promote user', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    promoteLoading.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Admin Panel">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="createModalOpen = true"
          >
            Create User
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="overflow-x-auto">
        <UTable
          :data="users"
          :loading="loading"
          :columns="[
            { accessorKey: 'username', header: 'Username' },
            { accessorKey: 'role', header: 'Role' },
            { accessorKey: 'is_active', header: 'Status' },
            { accessorKey: 'is_temp', header: 'Type' },
            { accessorKey: 'password_hint', header: 'Password Hint' },
            { accessorKey: 'created_at', header: 'Created' },
            { accessorKey: 'actions', header: '', id: 'actions' }
          ]"
          class="min-w-[900px]"
        >
          <template #username-cell="{ row }">
            <span class="font-medium">{{ row.original.username }}</span>
          </template>

          <template #role-cell="{ row }">
            <UBadge
              :color="row.original.role === 'admin' ? 'warning' : 'primary'"
              variant="soft"
              size="sm"
            >
              {{ row.original.role }}
            </UBadge>
          </template>

          <template #is_active-cell="{ row }">
            <UBadge
              :color="getStatusColor(row.original.is_active)"
              variant="soft"
              size="sm"
            >
              {{ row.original.is_active ? 'Active' : 'Inactive' }}
            </UBadge>
          </template>

          <template #is_temp-cell="{ row }">
            <UBadge
              v-if="row.original.is_temp"
              color="warning"
              variant="soft"
              size="sm"
            >
              Temp
            </UBadge>
            <span
              v-else
              class="text-sm text-muted"
            >Permanent</span>
          </template>

          <template #password_hint-cell="{ row }">
            <span class="text-sm text-muted">{{ row.original.password_hint || '-' }}</span>
          </template>

          <template #created_at-cell="{ row }">
            <span class="text-sm text-muted">{{ new Date(row.original.created_at).toLocaleString() }}</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-2 justify-end">
              <UButton
                v-if="row.original.is_temp"
                color="warning"
                variant="ghost"
                size="xs"
                icon="i-lucide-star"
                @click="openPromote(row.original)"
              >
                Promote
              </UButton>
              <UButton
                color="primary"
                variant="ghost"
                size="xs"
                icon="i-lucide-key-round"
                @click="openReset(row.original)"
              >
                Reset Password
              </UButton>
              <UButton
                :color="row.original.is_active ? 'warning' : 'success'"
                variant="ghost"
                size="xs"
                :icon="row.original.is_active ? 'i-lucide-pause-circle' : 'i-lucide-play-circle'"
                @click="toggleActive(row.original)"
              >
                {{ row.original.is_active ? 'Deactivate' : 'Activate' }}
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                @click="confirmDelete(row.original)"
              >
                Delete
              </UButton>
            </div>
          </template>

          <template #empty>
            <div class="text-center py-12 text-muted">
              <UIcon
                name="i-lucide-users"
                class="w-12 h-12 mx-auto mb-4 opacity-50"
              />
              <p>No users found.</p>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Create User Modal -->
      <UModal v-model:open="createModalOpen">
        <template #content>
          <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
            <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between p-6 pb-4 border-b border-default/50">
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-primary/20">
                    <UIcon name="i-lucide-user-plus" class="w-5 h-5" />
                  </div>
                  <div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Create User</h3>
                    <p class="text-xs text-muted font-medium">Add a new member to the system</p>
                  </div>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="createModalOpen = false" />
              </div>
              
              <div class="p-6">
                <form class="space-y-5" @submit.prevent="handleCreate">
                  <UFormField label="Username" required>
                    <UInput v-model="createUsername" placeholder="Choose a username" icon="i-lucide-user" size="lg" class="w-full transition-all duration-300 hover:ring-primary/50 focus:ring-primary" />
                  </UFormField>
                  <UFormField label="Password" required>
                    <UInput v-model="createPassword" type="password" placeholder="At least 6 characters" icon="i-lucide-lock" size="lg" class="w-full transition-all duration-300 hover:ring-primary/50 focus:ring-primary" />
                  </UFormField>
                  <UFormField label="Password Hint (optional)">
                    <UInput v-model="createPasswordHint" placeholder="e.g. My pet's name" icon="i-lucide-tag" size="lg" class="w-full transition-all duration-300 hover:ring-primary/50 focus:ring-primary" />
                  </UFormField>
                  <UFormField label="Role">
                    <USelectMenu v-model="createRole" :items="['user', 'admin']" size="lg" class="w-full" />
                  </UFormField>
                </form>
              </div>
              
              <div class="flex justify-end gap-3 p-6 pt-4 border-t border-default/50 bg-muted/10">
                <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="createModalOpen = false">Cancel</UButton>
                <UButton color="primary" class="px-5 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95" :loading="isCreating" @click="handleCreate">Create User</UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Reset Password Modal -->
      <UModal v-model:open="resetModalOpen">
        <template #content>
          <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-default rounded-xl shadow-2xl">
            <div class="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between p-6 pb-4 border-b border-default/50">
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-blue-500/20">
                    <UIcon name="i-lucide-key-round" class="w-5 h-5" />
                  </div>
                  <div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight">Reset Password</h3>
                    <p class="text-xs text-muted font-medium">For <span class="text-blue-500">{{ resetTarget?.username }}</span></p>
                  </div>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-default/50 transition-colors" @click="resetModalOpen = false" />
              </div>
              
              <div class="p-6">
                <form class="space-y-5" @submit.prevent="handleReset">
                  <UFormField label="New Password" required>
                    <UInput v-model="resetPassword" type="password" placeholder="At least 6 characters" icon="i-lucide-lock" size="lg" class="w-full transition-all duration-300 hover:ring-blue-500/50 focus:ring-blue-500" />
                  </UFormField>
                </form>
              </div>
              
              <div class="flex justify-end gap-3 p-6 pt-4 border-t border-default/50 bg-muted/10">
                <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="resetModalOpen = false">Cancel</UButton>
                <UButton color="primary" class="px-5 shadow-lg shadow-blue-500/20 transition-transform hover:scale-105 active:scale-95 bg-blue-500 hover:bg-blue-600" :loading="isResetting" @click="handleReset">Reset</UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="confirmDeleteOpen">
        <template #content>
          <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-error/20 rounded-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
            <div class="absolute -top-1/2 -right-1/4 w-full h-full bg-error/10 rounded-full blur-3xl pointer-events-none" />
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between p-6 pb-4 border-b border-error/10">
                <div class="flex items-center gap-3 text-error">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-error/10 border border-error/20">
                    <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 class="font-bold text-lg leading-tight tracking-tight">Delete User</h3>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-error/10 hover:text-error transition-colors" @click="confirmDeleteOpen = false" />
              </div>
              
              <div class="p-6 text-center">
                <p class="text-lg">Are you sure you want to delete <strong class="text-error font-bold">{{ deleteTarget?.username }}</strong>?</p>
                <p class="text-sm text-muted mt-2">This action is permanent and cannot be undone.</p>
              </div>
              
              <div class="flex justify-end gap-3 p-6 pt-4 border-t border-error/10 bg-error/5">
                <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="confirmDeleteOpen = false">Cancel</UButton>
                <UButton color="error" class="px-5 shadow-lg shadow-error/30 transition-transform hover:scale-105 active:scale-95" :loading="isDeleting" @click="handleDelete">Yes, Delete</UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Promote Temp User Modal -->
      <UModal v-model:open="promoteModalOpen">
        <template #content>
          <div class="relative overflow-hidden bg-elevated/80 backdrop-blur-2xl border border-warning/20 rounded-xl shadow-2xl">
            <div class="absolute -top-20 -left-20 w-64 h-64 bg-warning/20 rounded-full blur-3xl pointer-events-none" />
            <div class="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between p-6 pb-4 border-b border-warning/20">
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 text-warning shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-warning/20">
                    <UIcon name="i-lucide-star" class="w-5 h-5" />
                  </div>
                  <div>
                    <h3 class="font-bold text-lg leading-tight tracking-tight text-warning-500">Promote User</h3>
                    <p class="text-xs text-muted font-medium">Convert <span class="text-warning">{{ promoteTarget?.username }}</span> to permanent</p>
                  </div>
                </div>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full hover:bg-warning/10 transition-colors" @click="promoteModalOpen = false" />
              </div>
              
              <div class="p-6">
                <form class="space-y-5" @submit.prevent="handlePromote">
                  <UFormField label="New Username" required>
                    <UInput v-model="promoteUsername" placeholder="Choose a username" icon="i-lucide-user" size="lg" class="w-full transition-all duration-300 hover:ring-warning/50 focus:ring-warning" />
                  </UFormField>
                  <UFormField label="Password" required>
                    <UInput v-model="promotePassword" type="password" placeholder="At least 6 characters" icon="i-lucide-lock" size="lg" class="w-full transition-all duration-300 hover:ring-warning/50 focus:ring-warning" />
                  </UFormField>
                </form>
              </div>
              
              <div class="flex justify-end gap-3 p-6 pt-4 border-t border-warning/20 bg-warning/5">
                <UButton color="neutral" variant="soft" class="px-5 transition-transform hover:scale-105 active:scale-95" @click="promoteModalOpen = false">Cancel</UButton>
                <UButton color="warning" class="px-5 shadow-lg shadow-warning/30 transition-transform hover:scale-105 active:scale-95" :loading="promoteLoading" @click="handlePromote">Promote User</UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
