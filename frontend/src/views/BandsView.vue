<script setup lang="ts">
    import { onMounted, ref } from 'vue'
    import BandCard from '../components/BandCard.vue'
    import BandCreateModal from '../components/BandCreateModal.vue'
    import { getBandsForUser, getSameSchoolStudents } from '../services/bandService'
    import { useAuthStore } from '../stores/authStore'
    import type { Band } from '../types/Band'

    const authStore = useAuthStore()
    const bands = ref<Band[]>([])
    const memberNames = ref<Record<string, string>>({})
    const showCreateModal = ref(false)
    const success = ref('')
    const error = ref('')

    onMounted(async () => {
        try {
            const [students, userBands] = await Promise.all([getSameSchoolStudents(), getBandsForUser()])
            memberNames.value = Object.fromEntries(students.map((student) => [student.id, student.email]))
            memberNames.value[authStore.uid] = authStore.email
            bands.value = userBands
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || 'Unable to load your bands.'
        }
    })

    function handleCreated(band: Band) {
        bands.value.unshift(band)
        showCreateModal.value = false
        success.value = 'Band application submitted and is pending approval.'
    }
</script>

<template>
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="mb-0">Bands</h1>
        <button v-if="authStore.role === 'student'" class="btn btn-primary" @click="showCreateModal = true">
            Create Band
        </button>
    </div>

    <div v-if="success" class="alert alert-success">{{ success }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="bands.length === 0" class="card p-4">
        <h5>No band applications yet.</h5>
        <p v-if="authStore.role === 'student'" class="mb-0 text-muted">Create a band with students from your school to get started.</p>
        <p v-else class="mb-0 text-muted">Band applications created by students will appear here.</p>
    </div>

    <div v-else class="row g-3">
        <div v-for="band in bands" :key="band.id" class="col-md-6 col-xl-4">
            <BandCard :band="band" :member-names="memberNames" />
        </div>
    </div>

    <BandCreateModal
        v-if="showCreateModal"
        :creator-id="authStore.uid"
        :creator-email="authStore.email"
        @close="showCreateModal = false"
        @created="handleCreated" />
</template>
