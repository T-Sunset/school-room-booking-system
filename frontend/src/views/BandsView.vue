<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue'
    import BandCard from '../components/BandCard.vue'
    import BandCreateModal from '../components/BandCreateModal.vue'
    import { approveBand, denyBand, disbandBand, getActiveBands, getBandsForUser, getPendingBands, getSameSchoolStudents, getSameSchoolUsers, leaveBand } from '../services/bandService'
    import { useAuthStore } from '../stores/authStore'
    import type { Band } from '../types/Band'

    const authStore = useAuthStore()
    const bands = ref<Band[]>([])
    const activeBands = ref<Band[]>([])
    const memberNames = ref<Record<string, string>>({})
    const showCreateModal = ref(false)
    const success = ref('')
    const error = ref('')
    const loading = ref(true)
    const actionBandId = ref('')
    const isStaff = authStore.role === 'teacher' || authStore.role === 'admin'
    const applications = computed(() => bands.value.filter((band) => band.status !== 'approved' && band.status !== 'disbanded'))

    onMounted(async () => {
        try {
            const studentsRequest = isStaff ? getSameSchoolUsers() : getSameSchoolStudents()
            const bandsRequest = isStaff ? getPendingBands() : getBandsForUser()
            const [students, userBands, approvedBands] = await Promise.all([studentsRequest, bandsRequest, getActiveBands()])
            memberNames.value = Object.fromEntries(students.map((student) => [student.id, student.email]))
            memberNames.value[authStore.uid] = authStore.email
            bands.value = userBands
            activeBands.value = approvedBands
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || `Unable to load ${isStaff ? 'band applications' : 'your bands'}.`
        } finally {
            loading.value = false
        }
    })

    function handleCreated(band: Band) {
        bands.value.unshift(band)
        showCreateModal.value = false
        success.value = 'Band application submitted and is pending approval.'
    }

    async function approve(band: Band) {
        await updateStatus(band, approveBand, 'approved')
    }

    async function deny(band: Band) {
        if (!window.confirm('Are you sure you want to deny this band application?')) return
        await updateStatus(band, denyBand, 'denied')
    }

    async function updateStatus(band: Band, action: (bandId: string) => Promise<{ status: Band['status'] }>, status: Band['status']) {
        if (actionBandId.value) return
        actionBandId.value = band.id
        error.value = ''
        success.value = ''
        try {
            const response = await action(band.id)
            if (response.status === status) {
                bands.value = bands.value.filter((pendingBand) => pendingBand.id !== band.id)
                success.value = `${band.name} was ${status}.`
            }
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || `Unable to ${status} the band application.`
        } finally {
            actionBandId.value = ''
        }
    }

    async function disband(band: Band) {
        if (!window.confirm(`Are you sure you want to disband ${band.name}?`)) return
        await updateActiveBand(band, disbandBand)
    }

    async function leave(band: Band) {
        if (!window.confirm(`Are you sure you want to leave ${band.name}?`)) return
        await updateActiveBand(band, leaveBand)
    }

    async function updateActiveBand(band: Band, action: (bandId: string) => Promise<{ status: Band['status'] }>) {
        if (actionBandId.value) return
        actionBandId.value = band.id
        error.value = ''
        success.value = ''
        try {
            const response = await action(band.id)
            if (response.status === 'disbanded') {
                activeBands.value = activeBands.value.filter((activeBand) => activeBand.id !== band.id)
            } else if (response.status === 'approved' && !isStaff) {
                const updatedBand = activeBands.value.find((activeBand) => activeBand.id === band.id)
                if (updatedBand) {
                    updatedBand.memberIds = updatedBand.memberIds.filter((memberId) => memberId !== authStore.uid)
                }
            }
            success.value = response.status === 'disbanded' ? `${band.name} was disbanded.` : `You left ${band.name}.`
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || 'Unable to update the band.'
        } finally {
            actionBandId.value = ''
        }
    }
</script>

<template>
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="mb-0">{{ isStaff ? 'Band Applications' : 'Bands' }}</h1>
        <button v-if="authStore.role === 'student'" class="btn btn-primary" @click="showCreateModal = true">
            Create Band
        </button>
    </div>

    <div v-if="success" class="alert alert-success">{{ success }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="loading" class="card p-4">Loading {{ isStaff ? 'band applications' : 'your bands' }}...</div>

    <div v-else-if="applications.length === 0" class="card p-4">
        <h5>{{ isStaff ? 'No pending band applications.' : 'No band applications yet.' }}</h5>
        <p v-if="!isStaff" class="mb-0 text-muted">Create a band with students from your school to get started.</p>
    </div>

    <template v-if="applications.length > 0">
        <h2 class="h4 mb-3">{{ isStaff ? 'Pending Applications' : 'Applications' }}</h2>
        <div class="row g-3 mb-4">
            <div v-for="band in applications" :key="band.id" class="col-md-6 col-xl-4">
            <BandCard :band="band" :member-names="memberNames" />
                <div v-if="isStaff" class="d-flex gap-2 mt-2">
                    <button class="btn btn-success" :disabled="actionBandId !== ''" @click="approve(band)">Approve</button>
                    <button class="btn btn-danger" :disabled="actionBandId !== ''" @click="deny(band)">Deny</button>
                </div>
            </div>
        </div>
    </template>

    <template v-if="activeBands.length > 0">
        <h2 class="h4 mb-3">Active Bands</h2>
        <div class="row g-3">
            <div v-for="band in activeBands" :key="band.id" class="col-md-6 col-xl-4">
                <BandCard :band="band" :member-names="memberNames" />
                <div class="d-flex gap-2 mt-2">
                    <button v-if="isStaff || band.createdBy === authStore.uid" class="btn btn-danger" :disabled="actionBandId !== ''" @click="disband(band)">Disband</button>
                    <button v-else class="btn btn-outline-danger" :disabled="actionBandId !== ''" @click="leave(band)">Leave</button>
                </div>
            </div>
        </div>
    </template>

    <div v-if="!loading && activeBands.length === 0" class="card p-4 mt-4">
        <h5>{{ isStaff ? 'No active bands at this school.' : 'You are not currently in any active bands.' }}</h5>
        <p class="mb-0 text-muted">Active bands appear here after they have been approved.</p>
    </div>

    <BandCreateModal
        v-if="showCreateModal"
        :creator-id="authStore.uid"
        :creator-email="authStore.email"
        @close="showCreateModal = false"
        @created="handleCreated" />
</template>
