<script setup lang="ts">
	import { onMounted, ref } from 'vue'
	import { getAuditLogs } from '../services/auditService'
	import type { AuditAction, AuditEntityType, AuditLogEvent } from '../types/AuditLog'
	import { useAuthStore } from '../stores/authStore'
	import { changeUserRole, getUsers } from '../services/userService'
	import type { AdminUser } from '../types/AdminUser'
	import type { UserRole } from '../types/UserRole'

	const authStore = useAuthStore()
	const events = ref<AuditLogEvent[]>([])
	const loading = ref(false)
	const error = ref('')
	const from = ref('')
	const to = ref('')
	const action = ref('')
	const actor = ref('')
	const entityType = ref('')
	const currentCursor = ref<string | undefined>(undefined)
	const nextCursor = ref<string | null>(null)
	const previousCursors = ref<Array<string | undefined>>([])
	const users = ref<AdminUser[]>([])
	const usersLoading = ref(false)
	const usersError = ref('')
	const roleChangeTarget = ref<AdminUser | null>(null)
	const roleSelections = ref<Record<string, AdminUser['role']>>({})
	const roleChangeUserId = ref('')
	const roleChangeError = ref('')
	const roleChangeSuccess = ref('')
	const roleOptions: Array<Exclude<UserRole, 'na'>> = ['student', 'teacher', 'admin']

	const actions: AuditAction[] = [
		'user.profile_created', 'user.role_changed',
		'room.created', 'room.updated', 'room.deactivated', 'room.reactivated',
		'booking.created', 'booking.approved', 'booking.denied', 'booking.cancelled',
		'band.created', 'band.member_left', 'band.approved', 'band.denied', 'band.disbanded',
		'strike.issued', 'band.strike_issued', 'attendance.marked', 'attendance.changed'
	]
	const entityTypes: AuditEntityType[] = ['user', 'room', 'booking', 'band', 'strike', 'attendance']

	onMounted(() => {
		loadUsers()
		loadPage()
	})

	async function loadUsers() {
		if (authStore.role !== 'admin') return
		usersLoading.value = true
		usersError.value = ''
		try {
			const result = await getUsers()
			users.value = result
			roleSelections.value = Object.fromEntries(result.map((user) => [user.id, user.role]))
		} catch (err: any) {
			usersError.value = err.response?.data?.error || err.message || 'Unable to load users.'
		} finally {
			usersLoading.value = false
		}
	}

	function roleLabel(role: AdminUser['role']) {
		return role.charAt(0).toUpperCase() + role.slice(1)
	}

	function isCurrentUser(user: AdminUser) {
		return user.id === authStore.uid
	}

	function selectedRole(user: AdminUser) {
		return roleSelections.value[user.id] || user.role
	}

	function canSubmitRoleChange(user: AdminUser) {
		return !isCurrentUser(user) && selectedRole(user) !== user.role && roleChangeUserId.value !== user.id
	}

	function openRoleChange(user: AdminUser) {
		if (!canSubmitRoleChange(user)) return
		roleChangeError.value = ''
		roleChangeSuccess.value = ''
		roleChangeTarget.value = user
	}

	function closeRoleChange() {
		if (roleChangeUserId.value) return
		roleChangeTarget.value = null
		roleChangeError.value = ''
	}

	async function confirmRoleChange() {
		const target = roleChangeTarget.value
		if (!target || roleChangeUserId.value) return

		const newRole = selectedRole(target)
		if (newRole === target.role) return

		roleChangeUserId.value = target.id
		roleChangeError.value = ''
		roleChangeSuccess.value = ''
		try {
			await changeUserRole(target.id, newRole)
			await loadUsers()
			roleChangeTarget.value = null
			roleChangeSuccess.value = `${target.email} is now ${roleLabel(newRole)}.`
		} catch (err: any) {
			roleChangeError.value = err.response?.data?.error || err.message || 'Unable to change this user role.'
		} finally {
			roleChangeUserId.value = ''
		}
	}

	async function loadPage(cursor?: string) {
		if (authStore.role !== 'admin') return
		loading.value = true
		error.value = ''
		try {
			const response = await getAuditLogs({
				from: from.value || undefined,
				to: to.value || undefined,
				action: action.value || undefined,
				actor: actor.value.trim() || undefined,
				entityType: entityType.value || undefined,
				cursor
			})
			events.value = response.events
			currentCursor.value = cursor
			nextCursor.value = response.nextCursor
		} catch (err: any) {
			error.value = err.response?.data?.error || err.message || 'Unable to load audit events.'
		} finally {
			loading.value = false
		}
	}

	function applyFilters() {
		previousCursors.value = []
		nextCursor.value = null
		loadPage()
	}

	function loadNextPage() {
		if (!nextCursor.value || loading.value) return
		previousCursors.value.push(currentCursor.value)
		loadPage(nextCursor.value)
	}

	function loadPreviousPage() {
		if (previousCursors.value.length === 0 || loading.value) return
		loadPage(previousCursors.value.pop())
	}

	function formatTimestamp(value: string) {
		return new Date(value).toLocaleString()
	}

	function formatMetadata(event: AuditLogEvent) {
		return event.metadata ? JSON.stringify(event.metadata) : '-'
	}
</script>

<template>
	<div v-if="authStore.role !== 'admin'" class="alert alert-danger">
		You are not authorised to view audit logs.
	</div>

	<template v-else>
		<section class="mb-4" aria-labelledby="user-roles-title">
			<div class="section-header">
				<h2 id="user-roles-title" class="h4 mb-0">User Roles</h2>
				<button class="btn btn-outline-primary" :disabled="usersLoading" @click="loadUsers">Refresh users</button>
			</div>
			<div v-if="roleChangeSuccess" class="alert alert-success" role="status">{{ roleChangeSuccess }}</div>
			<div v-if="usersError" class="alert alert-danger" role="alert">{{ usersError }}</div>
			<div v-if="usersLoading" class="loading-state" role="status">Loading users...</div>
			<div v-else-if="!usersError && users.length === 0" class="empty-state">No users found.</div>
			<div v-else-if="!usersError" class="card data-card table-responsive">
				<table class="table table-striped table-sm data-table align-middle mb-0">
					<thead>
						<tr>
							<th>User</th>
							<th>Current Role</th>
							<th>New Role</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="user in users" :key="user.id">
							<td>
								<strong>{{ user.email }}</strong>
								<span v-if="isCurrentUser(user)" class="d-block text-muted">Current user</span>
							</td>
							<td><span class="status-badge status-neutral">{{ roleLabel(user.role) }}</span></td>
							<td>
								<label class="visually-hidden" :for="`role-${user.id}`">New role for {{ user.email }}</label>
								<select :id="`role-${user.id}`" class="form-select" :value="selectedRole(user)" :disabled="isCurrentUser(user) || roleChangeUserId === user.id" @change="roleSelections[user.id] = ($event.target as HTMLSelectElement).value as AdminUser['role']">
									<option v-for="role in roleOptions" :key="role" :value="role">{{ roleLabel(role) }}</option>
								</select>
							</td>
							<td>
								<span v-if="isCurrentUser(user)" class="text-muted">Current user</span>
								<button v-else class="btn btn-sm btn-primary" :disabled="!canSubmitRoleChange(user)" @click="openRoleChange(user)">
									{{ roleChangeUserId === user.id ? 'Changing...' : 'Change' }}
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<div v-if="roleChangeTarget" class="modal-backdrop-custom" @click.self="closeRoleChange">
			<div class="modal-dialog-custom role-change-dialog" role="dialog" aria-modal="true" aria-labelledby="role-change-title">
				<div class="card p-4 modal-card">
					<h2 id="role-change-title" class="h4">Change user role?</h2>
					<dl class="mb-4">
						<dt>User</dt>
						<dd class="text-wrap-anywhere">{{ roleChangeTarget.email }}</dd>
						<dt>Current role</dt>
						<dd>{{ roleLabel(roleChangeTarget.role) }}</dd>
						<dt>New role</dt>
						<dd>{{ roleLabel(selectedRole(roleChangeTarget)) }}</dd>
					</dl>
					<p class="text-muted">This changes the user's access to the system.</p>
					<div v-if="roleChangeError" class="alert alert-danger" role="alert">{{ roleChangeError }}</div>
					<div class="d-flex justify-content-end gap-2">
						<button class="btn btn-secondary" :disabled="roleChangeUserId !== ''" @click="closeRoleChange">Keep Current Role</button>
						<button class="btn btn-primary" :disabled="roleChangeUserId !== ''" @click="confirmRoleChange">
							{{ roleChangeUserId ? 'Changing...' : 'Change Role' }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="view-header">
			<h2 class="h4 mb-0">Audit Log</h2>
			<button class="btn btn-primary" :disabled="loading" @click="applyFilters">Refresh</button>
		</div>

		<form class="card form-section filter-form mb-3" @submit.prevent="applyFilters">
			<div class="row g-2 align-items-end">
				<div class="col-md-2">
					<label class="form-label" for="audit-from">From</label>
					<input id="audit-from" v-model="from" class="form-control" type="date">
				</div>
				<div class="col-md-2">
					<label class="form-label" for="audit-to">To</label>
					<input id="audit-to" v-model="to" class="form-control" type="date">
				</div>
				<div class="col-md-3">
					<label class="form-label" for="audit-action">Action</label>
					<select id="audit-action" v-model="action" class="form-select">
						<option value="">All actions</option>
						<option v-for="auditAction in actions" :key="auditAction" :value="auditAction">{{ auditAction }}</option>
					</select>
				</div>
				<div class="col-md-2">
					<label class="form-label" for="audit-actor">Actor</label>
					<input id="audit-actor" v-model="actor" class="form-control" type="search" placeholder="Email or user ID">
				</div>
				<div class="col-md-2">
					<label class="form-label" for="audit-entity">Entity type</label>
					<select id="audit-entity" v-model="entityType" class="form-select">
						<option value="">All entities</option>
						<option v-for="type in entityTypes" :key="type" :value="type">{{ type }}</option>
					</select>
				</div>
				<div class="col-md-1 d-grid">
					<button class="btn btn-outline-primary" type="submit" :disabled="loading">Apply</button>
				</div>
			</div>
		</form>

		<div v-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-if="loading" class="loading-state" role="status">Loading audit events...</div>
		<div v-else-if="!error && events.length === 0" class="empty-state">No audit events found.</div>
		<div v-else class="card data-card table-responsive">
			<table class="table table-striped table-sm data-table align-middle mb-0">
				<thead>
					<tr>
						<th>Date/time</th>
						<th>Actor</th>
						<th>Action</th>
						<th>Entity</th>
						<th>Context</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="event in events" :key="event.id">
						<td>{{ formatTimestamp(event.timestamp) }}</td>
						<td>{{ event.actor.email }}</td>
						<td><span class="status-badge status-neutral"><code>{{ event.action }}</code></span></td>
						<td><strong>{{ event.entityType }}</strong><small class="d-block text-muted text-wrap-anywhere">{{ event.entityId }}</small></td>
						<td class="audit-context text-break">{{ formatMetadata(event) }}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="d-flex justify-content-between mt-3">
			<button class="btn btn-outline-secondary" :disabled="loading || previousCursors.length === 0" @click="loadPreviousPage">Previous</button>
			<button class="btn btn-outline-secondary" :disabled="loading || !nextCursor" @click="loadNextPage">Next</button>
		</div>
	</template>
</template>