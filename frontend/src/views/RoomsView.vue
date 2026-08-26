<script setup lang="ts">
    // RoomsView.vue
    import { ref, onMounted } from 'vue';
    import type { Room } from '../types/Room';
    import { getRooms } from '../services/roomService';
    import { useAuthStore } from '../stores/authStore';
    import RoomModal from '../components/RoomModal.vue';
    import { useRouter } from 'vue-router';

    // Get Auth Store
    const authStore = useAuthStore()

    // Get rooms
    const rooms = ref<Room[]>([])
    const loading = ref(true)
    const error = ref("")

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
            rooms.value = await getRooms()
        } catch (err:any) {
            // Report on any errors if they occur
            console.log(err.response?.data)
            error.value = err.response?.data || "Failed to load rooms."
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
        if (!room.isBookable) return "Unavailable"
        return room.isInUse ? "In use" : "Available"
    }

    function formatNextAvailable(room: Room) {
        if (!room.isBookable || !room.nextAvailable) return "Unavailable"
        return new Date(room.nextAvailable).toLocaleString()
    }
</script>

<template>
    <!-- Header -->
    <h1 class="mb-4">Rooms View</h1>

    <!-- Loading Message -->
     <div v-if="loading">
        Loading Rooms... Please Wait.
     </div>

    <!-- Error Message -->
     <div v-if="error" class="alert alert-danger">
        {{ error }}
     </div>

    <!-- Content Card -->
     <div class="card p-3" v-if="!loading && rooms.length">
        <!-- Table displaying rooms -->
         <table class="table table-striped">
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
                    <td>{{ getRoomStatus(room) }}</td>
                    <td>{{ formatNextAvailable(room) }}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-2" @click="viewRoom(room.id)">
                            View
                        </button>
                        <button class="btn btn-sm btn-warning me-2" @click="openRoomModal(room)">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger">
                            Remove
                        </button>
                    </td>
                </tr>
             </tbody>
         </table>
     </div>

    <!-- No Rooms? (Megamind face here) -->
    <div v-else-if="!loading" class="card p-3">
        <h5>No Rooms Found.</h5>
    </div>

    <!-- Add Room Button -->
     <!-- FOR TESTING PURPOSES, THIS IS SET TO NOT-ADMINS. CHANGE!! -->
    <div class="d-flex justify-content-end align-items-end mt-3" v-if="authStore.role === 'admin'">
        <div class="card shadow-sm"  style="width:12rem">
            <button class="btn btn-lg btn-success" @click="openRoomModal()">
                + Add Room
            </button>
        </div>
     </div>

     <!-- Create Room / Edit Room Modal -->
     <RoomModal v-if="showRoomModal" @close="closeRoomModal" @finished="loadRooms" :roomData="selectedRoom"></RoomModal>
</template>