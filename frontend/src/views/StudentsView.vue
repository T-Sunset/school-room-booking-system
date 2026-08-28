<script setup lang="ts">
    import { onMounted, ref } from 'vue'
    import { getStudentRoster, issueStudentStrike } from '../services/userService'
    import { useAuthStore } from '../stores/authStore'
    import type { StudentRosterEntry } from '../types/Student'

    const authStore = useAuthStore()
    const students = ref<StudentRosterEntry[]>([])
    const loading = ref(true)
    const error = ref('')
    const success = ref('')
    const actionStudentId = ref('')
    const isStaff = authStore.role === 'teacher' || authStore.role === 'admin'

    onMounted(loadRoster)

    async function loadRoster() {
        if (!isStaff) {
            loading.value = false
            return
        }

        loading.value = true
        error.value = ''
        try {
            students.value = await getStudentRoster()
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || 'Unable to load the student roster.'
        } finally {
            loading.value = false
        }
    }

    function statusLabel(student: StudentRosterEntry) {
        if (student.strikeStatus.isBanned) {
            return `Banned until ${formatDate(student.strikeStatus.banExpiresAt)}`
        }
        if (student.strikeStatus.hasWarning) return 'Warned'
        return 'Clear'
    }

    function statusClass(student: StudentRosterEntry) {
        if (student.strikeStatus.isBanned) return 'status-danger'
        if (student.strikeStatus.hasWarning) return 'status-warning'
        return 'status-success'
    }

    function formatDate(value: string | null) {
        return value ? new Date(value).toLocaleString() : 'unknown'
    }

    async function issueStrike(student: StudentRosterEntry) {
        const reason = window.prompt(`Reason for issuing a strike to ${student.email}:`)
        if (reason === null) return
        if (!reason.trim()) {
            error.value = 'A reason is required to issue a strike.'
            return
        }

        actionStudentId.value = student.id
        error.value = ''
        success.value = ''
        try {
            await issueStudentStrike(student.id, reason.trim())
            await loadRoster()
            success.value = `Strike issued to ${student.email}.`
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || 'Unable to issue the strike.'
        } finally {
            actionStudentId.value = ''
        }
    }
</script>

<template>
    <div v-if="!isStaff" class="alert alert-danger">
        You are not authorised to view the student roster.
    </div>

    <template v-else>
        <div class="view-header">
            <h1 class="mb-0">Student Roster</h1>
            <button class="btn btn-primary" :disabled="loading || actionStudentId !== ''" @click="loadRoster">Refresh</button>
        </div>

        <div v-if="success" class="alert alert-success">{{ success }}</div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="loading" class="loading-state" role="status">Loading student roster...</div>
        <div v-else-if="students.length === 0" class="empty-state">No students found in your school.</div>
        <div v-else class="card data-card table-responsive">
            <table class="table table-striped table-sm data-table align-middle mb-0">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Year Level</th>
                        <th>Strike Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="student in students" :key="student.id">
                        <td>
                            <strong class="d-block text-wrap-anywhere">{{ student.email }}</strong>
                            <small class="text-muted">Student account</small>
                        </td>
                        <td>{{ student.yearLevel ?? '-' }}</td>
                        <td>
                            <span class="status-badge" :class="statusClass(student)">
                                {{ statusLabel(student) }}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger" :disabled="actionStudentId !== ''" @click="issueStrike(student)">
                                {{ actionStudentId === student.id ? 'Issuing...' : 'Issue strike' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </template>
</template>
