<script setup lang="ts">
    // RoomsView.vue
    import { ref, onMounted } from 'vue';
    import type { Room } from '../types/Room';
    import { deactivateRoom, getRooms } from '../services/roomService';
    import { useAuthStore } from '../stores/authStore';
    import RoomModal from '../components/RoomModal.vue';
    import { useRouter } from 'vue-router';

    // Get Auth Store
    const authStore = useAuthStore()

    // Get rooms
    const rooms = ref<Room[]>([])
    const loading = ref(true)
    const error = ref("")
    const success = ref("")
    const actionRoomId = ref("")

    // Get Router
    const router = useRouter()

    // Do we have a room selected?
    const selectedRoom = ref<Room | null>(null) // Can be a Room object or Null. Null by default.

    // On Start / Mounted
    onMounted(async () => {
        // Get our rooms from back-end
        await loadRooms()
    })

    // Load rooms from backend
    async function loadRooms() {
        // Get our rooms from back-end
        try {
            loading.value = true
            error.value = ""
            rooms.value = await getRooms()
        } catch (err:any) {
            // Report on any errors if they occur
            console.log(err.response?.data)
            error.value = err.response?.data?.error || err.message || "Failed to load rooms."
        } finally {
            loading.value = false
        }
    }

    // Modal State (create / edit room popup modal)
    const showRoomModal = ref(false)
    function openRoomModal(room?: Room) {
        selectedRoom.value = room ?? null
        showRoomModal.value = true
    }
    function closeRoomModal() {
        showRoomModal.value = false
        selectedRoom.value = null
    }

    // Load a specific room in Rooms/View
    function viewRoom(roomId:string) {
        router.push(`/rooms/${roomId}`)
    }

    function getRoomStatus(room: Room) {
        if (!room.isBookable) return "Inactive"
        return room.isInUse ? "In use" : "Available"
    }

    function getRoomStatusClass(room: Room) {
        if (!room.isBookable) return "status-neutral"
        return room.isInUse ? "status-warning" : "status-available"
    }

    async function removeRoom(room: Room) {
        if (!window.confirm(`Deactivate ${room.name}? Historical bookings will be preserved.`)) return

        actionRoomId.value = room.id
        error.value = ""
        success.value = ""
        try {
            await deactivateRoom(room.id)
            await loadRooms()
            success.value = `${room.name} was deactivated.`
        } catch (err:any) {
            error.value = err.response?.data?.error || err.message || "Unable to deactivate room."
        } finally {
            actionRoomId.value = ""
        }
    }

    function formatNextAvailable(room: Room) {
        if (!room.isBookable || !room.nextAvailable) return "Unavailable"
        return new Date(room.nextAvailable).toLocaleString()
    }
</script>

<template>
    <div class="view-header">
        <div>
            <h1>Rooms</h1>
            <p class="section-description mb-0">Browse room availability and booking rules.</p>
        </div>
        <button v-if="authStore.role === 'admin'" class="btn btn-primary" @click="openRoomModal()">Add room</button>
    </div>

    <!-- Loading Message -->
    <div v-if="loading" class="loading-state" role="status">
        Loading Rooms... Please Wait.
     </div>

    <!-- Error Message -->
     <div v-if="error" class="alert alert-danger">
        {{ error }}
     </div>
    <div v-if="success" class="alert alert-success">
        {{ success }}
    </div>

    <!-- Content Card -->
    <div class="card data-card table-responsive" v-if="!loading && rooms.length">
        <!-- Table displaying rooms -->
         <table class="table table-striped table-sm data-table">
            <!-- Column Headers -->
            <thead>
                <tr>
                    <th>Room Name</th>
                    <th>Room Status</th>
                    <th>Next Available</th>
                    <th>Actions</th>
                </tr>
            </thead>

            <!-- Table Body -->
             <tbody>
                <tr v-for="room in rooms" :key="room.id">
                    <td>{{ room.name }}</td>
                    <td><span class="status-badge" :class="getRoomStatusClass(room)">{{ getRoomStatus(room) }}</span></td>
                    <td class="text-muted">{{ formatNextAvailable(room) }}</td>
                    <td class="action-row">
                        <button class="btn btn-sm btn-primary" @click="viewRoom(room.id)">
                            View
                        </button>
                        <button v-if="authStore.role === 'admin'" class="btn btn-sm btn-warning" :disabled="actionRoomId !== ''" @click="openRoomModal(room)">
                            Edit
                        </button>
                        <button v-if="authStore.role === 'admin' && room.isBookable" class="btn btn-sm btn-danger" :disabled="actionRoomId !== ''" @click="removeRoom(room)">
                            {{ actionRoomId === room.id ? 'Deactivating...' : 'Remove' }}
                        </button>
                        <span v-else-if="!room.isBookable" class="text-muted">Inactive</span>
                    </td>
                </tr>
             </tbody>
         </table>
     </div>

    <!-- No Rooms? (Megamind face here) -->
    <div v-else-if="!loading" class="empty-state">
        <h5>No Rooms Found.</h5>
    </div>

     <!-- Create Room / Edit Room Modal -->
     <RoomModal v-if="showRoomModal" @close="closeRoomModal" @finished="loadRooms" :roomData="selectedRoom"></RoomModal>
</template>