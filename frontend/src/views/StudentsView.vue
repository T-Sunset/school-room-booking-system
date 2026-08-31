<script setup lang="ts">
    import { nextTick, onMounted, ref } from 'vue'
    import { getStudentRoster, issueStudentStrike } from '../services/userService'
    import { useAuthStore } from '../stores/authStore'
    import type { StudentRosterEntry } from '../types/Student'

    const authStore = useAuthStore()
    const students = ref<StudentRosterEntry[]>([])
    const loading = ref(true)
    const error = ref('')
    const success = ref('')
    const actionStudentId = ref('')
    const strikeStudent = ref<StudentRosterEntry | null>(null)
    const strikeReason = ref('')
    const strikeDialogError = ref('')
    const strikeReasonInput = ref<HTMLTextAreaElement | null>(null)
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

    async function openStrikeDialog(student: StudentRosterEntry) {
        strikeStudent.value = student
        strikeReason.value = ''
        strikeDialogError.value = ''
        await nextTick()
        strikeReasonInput.value?.focus()
    }

    function closeStrikeDialog() {
        strikeStudent.value = null
        strikeReason.value = ''
        strikeDialogError.value = ''
    }

    async function issueStrike() {
        const student = strikeStudent.value
        const reason = strikeReason.value.trim()
        if (!student) return
        if (!reason) {
            strikeDialogError.value = 'A reason is required to issue a strike.'
            strikeReasonInput.value?.focus()
            return
        }

        actionStudentId.value = student.id
        strikeDialogError.value = ''
        error.value = ''
        success.value = ''
        try {
            await issueStudentStrike(student.id, reason)
            await loadRoster()
            success.value = `Strike issued to ${student.email}.`
            closeStrikeDialog()
        } catch (err: any) {
            strikeDialogError.value = err.response?.data?.error || err.message || 'Unable to issue the strike.'
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
                            <button class="btn btn-sm btn-outline-danger" :disabled="actionStudentId !== ''" @click="openStrikeDialog(student)">
                                {{ actionStudentId === student.id ? 'Issuing...' : 'Issue strike' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </template>

    <div v-if="strikeStudent" class="modal-backdrop-custom" @keydown.esc="closeStrikeDialog">
        <div
            class="modal-dialog-custom"
            role="dialog"
            aria-modal="true"
            aria-labelledby="strike-modal-title"
            aria-describedby="strike-modal-description"
            tabindex="-1">
            <div class="card p-4 modal-card">
                <h4 id="strike-modal-title">Issue a strike</h4>
                <p id="strike-modal-description">
                    Issue a strike to <strong>{{ strikeStudent.email }}</strong>.
                </p>
                <div v-if="strikeDialogError" class="alert alert-danger" role="alert">{{ strikeDialogError }}</div>
                <form @submit.prevent="issueStrike">
                    <label for="strike-reason" class="form-label">Reason</label>
                    <textarea
                        id="strike-reason"
                        ref="strikeReasonInput"
                        v-model="strikeReason"
                        class="form-control form-textarea-resizable"
                        rows="4"
                        required
                        aria-required="true"
                        placeholder="Enter the reason for this strike."></textarea>
                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button type="button" class="btn btn-secondary" :disabled="actionStudentId !== ''" @click="closeStrikeDialog">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-danger" :disabled="actionStudentId !== '' || !strikeReason.trim()">
                            {{ actionStudentId !== '' ? 'Issuing...' : 'Issue Strike' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
