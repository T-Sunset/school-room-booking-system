<script setup lang="ts">
    import type { Band } from '../types/Band'

    const props = defineProps<{
        band: Band,
        memberNames?: Record<string, string>
    }>()

    const statusLabels: Record<Band['status'], string> = {
        pending: 'Pending',
        approved: 'Approved',
        denied: 'Denied',
        disbanded: 'Disbanded'
    }
</script>

<template>
    <div class="card">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                <h5 class="card-title mb-0">{{ props.band.name }}</h5>
                <span class="status-badge" :class="`status-${props.band.status}`">
                    {{ statusLabels[props.band.status] }}
                </span>
            </div>
            <h6 class="card-subtitle mb-2 text-muted">Members ({{ props.band.memberIds.length }})</h6>
            <ul class="list-group list-group-flush band-member-list">
                <li v-for="memberId in props.band.memberIds" :key="memberId" class="list-group-item px-0 text-wrap-anywhere">
                    {{ props.memberNames?.[memberId] || memberId }}
                </li>
            </ul>
        </div>
    </div>
</template>
