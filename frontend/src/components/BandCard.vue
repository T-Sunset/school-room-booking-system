<script setup lang="ts">
    import type { Band } from '../types/Band'

    const props = defineProps<{
        band: Band,
        memberNames?: Record<string, string>
    }>()

    const statusLabels: Record<Band['status'], string> = {
        pending: 'Pending',
        approved: 'Approved',
        denied: 'Denied'
    }
</script>

<template>
    <div class="card h-100">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                <h5 class="card-title mb-0">{{ props.band.name }}</h5>
                <span class="badge" :class="`text-bg-${props.band.status === 'pending' ? 'warning' : props.band.status === 'approved' ? 'success' : 'danger'}`">
                    {{ statusLabels[props.band.status] }}
                </span>
            </div>
            <h6 class="card-subtitle mb-2 text-muted">Members</h6>
            <ul class="list-group list-group-flush">
                <li v-for="memberId in props.band.memberIds" :key="memberId" class="list-group-item px-0">
                    {{ props.memberNames?.[memberId] || memberId }}
                </li>
            </ul>
        </div>
    </div>
</template>
