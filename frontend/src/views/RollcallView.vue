<script setup lang="ts">
    import { onMounted, ref } from 'vue'
    import { getRollcall } from '../services/bookingService'
    import { useAuthStore } from '../stores/authStore'
    import type { RollcallEntry } from '../types/Booking'

    const authStore = useAuthStore()
    const entries = ref<RollcallEntry[]>([])
    const loading = ref(true)
    const error = ref('')
    const lastUpdated = ref('')

    const isStaff = authStore.role === 'teacher' || authStore.role === 'admin'

    onMounted(loadRollcall)

    async function loadRollcall() {
        if (!isStaff) {
            loading.value = false
            return
        }

        loading.value = true
        error.value = ''
        try {
            entries.value = await getRollcall()
            lastUpdated.value = new Date().toLocaleString()
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || 'Unable to load Rollcall.'
        } finally {
            loading.value = false
        }
    }
</script>

<template>
    <div v-if="!isStaff" class="alert alert-danger">
        You are not authorised to view Rollcall.
    </div>

    <template v-else>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h1 class="mb-0">Rollcall</h1>
            <button class="btn btn-primary" :disabled="loading" @click="loadRollcall">Refresh</button>
        </div>

        <p v-if="lastUpdated" class="text-muted">Last updated: {{ lastUpdated }}</p>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else-if="loading" class="card p-3">Loading Rollcall...</div>
        <div v-else-if="entries.length === 0" class="card p-3 text-muted">No students are currently recorded as being in the building.</div>
        <div v-else class="card p-3 table-responsive">
            <table class="table table-striped align-middle mb-0">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Room</th>
                        <th>Band</th>
                        <th>Booking Ends</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in entries" :key="`${entry.bookingId}-${entry.studentId}`">
                        <td>{{ entry.studentEmail }}</td>
                        <td>{{ entry.roomName }}</td>
                        <td>{{ entry.bandName || '-' }}</td>
                        <td>{{ new Date(entry.endTime).toLocaleString() }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </template>
</template>