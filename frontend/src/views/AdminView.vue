<script setup lang="ts">
	import { onMounted, ref } from 'vue'
	import { getAuditLogs } from '../services/auditService'
	import type { AuditAction, AuditEntityType, AuditLogEvent } from '../types/AuditLog'
	import { useAuthStore } from '../stores/authStore'

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

	const actions: AuditAction[] = [
		'user.profile_created', 'user.role_changed',
		'room.created', 'room.updated', 'room.deactivated', 'room.reactivated',
		'booking.created', 'booking.approved', 'booking.denied', 'booking.cancelled',
		'band.created', 'band.member_left', 'band.approved', 'band.denied', 'band.disbanded',
		'strike.issued', 'band.strike_issued', 'attendance.marked', 'attendance.changed'
	]
	const entityTypes: AuditEntityType[] = ['user', 'room', 'booking', 'band', 'strike', 'attendance']

	onMounted(() => loadPage())

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
		<div class="view-header">
			<h1 class="mb-0">Audit Log</h1>
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