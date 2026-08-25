<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue'
    import { createBand, getSameSchoolStudents } from '../services/bandService'
    import type { Band, SchoolStudent } from '../types/Band'

    const props = defineProps<{
        creatorId: string,
        creatorEmail: string
    }>()

    const emit = defineEmits<{
        close: []
        created: [band: Band]
    }>()

    const bandName = ref('')
    const searchTerm = ref('')
    const students = ref<SchoolStudent[]>([])
    const selectedStudents = ref<SchoolStudent[]>([])
    const loadingStudents = ref(false)
    const submitting = ref(false)
    const error = ref('')

    const selectedMemberCount = computed(() => selectedStudents.value.length + 1)
    const filteredStudents = computed(() => {
        const search = searchTerm.value.trim().toLowerCase()
        if (!search) return students.value
        return students.value.filter((student) => student.email.toLowerCase().includes(search))
    })

    onMounted(loadStudents)

    async function loadStudents() {
        loadingStudents.value = true
        error.value = ''
        try {
            students.value = (await getSameSchoolStudents()).filter((student) => student.id !== props.creatorId)
        } catch (err: any) {
            error.value = err.response?.data?.message || err.message || 'Unable to load students.'
        } finally {
            loadingStudents.value = false
        }
    }

    function isSelected(studentId: string) {
        return selectedStudents.value.some((student) => student.id === studentId)
    }

    function toggleStudent(student: SchoolStudent) {
        if (isSelected(student.id)) {
            selectedStudents.value = selectedStudents.value.filter((selected) => selected.id !== student.id)
        } else {
            selectedStudents.value.push(student)
        }
    }

    function removeStudent(studentId: string) {
        selectedStudents.value = selectedStudents.value.filter((student) => student.id !== studentId)
    }

    async function submit() {
        error.value = ''
        const name = bandName.value.trim()
        if (!name) {
            error.value = 'Enter a band name.'
            return
        }
        if (selectedMemberCount.value < 2) {
            error.value = 'Select at least one other student.'
            return
        }

        submitting.value = true
        try {
            const response = await createBand({
                name,
                memberIds: [props.creatorId, ...selectedStudents.value.map((student) => student.id)]
            })
            emit('created', response.band)
        } catch (err: any) {
            error.value = err.response?.data?.error || err.response?.data?.message || err.message || 'Unable to create the band application.'
        } finally {
            submitting.value = false
        }
    }
</script>

<template>
    <div class="modal-backdrop-custom">
        <div class="modal-dialog-custom">
            <div class="card p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="mb-0">Create Band</h4>
                    <button type="button" class="btn-close" aria-label="Close" :disabled="submitting" @click="emit('close')"></button>
                </div>

                <form @submit.prevent="submit">
                    <div v-if="error" class="alert alert-danger">{{ error }}</div>

                    <div class="mb-3">
                        <label for="band-name" class="form-label">Band name</label>
                        <input id="band-name" v-model="bandName" class="form-control" type="text" maxlength="100" :disabled="submitting" required />
                    </div>

                    <div class="mb-3">
                        <label for="student-search" class="form-label">Find band members</label>
                        <input id="student-search" v-model="searchTerm" class="form-control" type="search" placeholder="Search by email" :disabled="submitting || loadingStudents" />
                    </div>

                    <div class="border rounded p-2 mb-3" style="max-height: 180px; overflow-y: auto;">
                        <div v-if="loadingStudents" class="text-muted">Loading students...</div>
                        <div v-else-if="filteredStudents.length === 0" class="text-muted">No students found.</div>
                        <button
                            v-for="student in filteredStudents"
                            v-else
                            :key="student.id"
                            type="button"
                            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                            :class="{ active: isSelected(student.id) }"
                            :disabled="submitting"
                            @click="toggleStudent(student)">
                            <span>{{ student.email }}</span>
                            <span v-if="isSelected(student.id)">Selected</span>
                        </button>
                    </div>

                    <div class="mb-3">
                        <h6>Selected members ({{ selectedMemberCount }})</h6>
                        <ul class="list-group">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>{{ props.creatorEmail }} (you)</span>
                                <span class="badge text-bg-secondary">Creator</span>
                            </li>
                            <li v-for="student in selectedStudents" :key="student.id" class="list-group-item d-flex justify-content-between align-items-center">
                                <span>{{ student.email }}</span>
                                <button type="button" class="btn btn-sm btn-outline-danger" :disabled="submitting" @click="removeStudent(student.id)">Remove</button>
                            </li>
                        </ul>
                    </div>

                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-secondary" :disabled="submitting" @click="emit('close')">Cancel</button>
                        <button type="submit" class="btn btn-primary" :disabled="submitting || loadingStudents">
                            {{ submitting ? 'Submitting...' : 'Submit Application' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-backdrop-custom {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-dialog-custom {
    width: 520px;
    max-width: 92%;
}
</style>
