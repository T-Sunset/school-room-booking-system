<script setup lang="ts">
    // BookingsView.vue
    // Imports
    import {ref, onMounted} from 'vue'
    import type { PossibleBooking } from '../types/Booking'
    import type { Room } from '../types/Room'
    import { getRoomsForBooking } from '../services/roomService'
    import BookingModal from '../components/BookingModal.vue'
    import { useRouter } from 'vue-router'

    // Get Router
    const router = useRouter()

    // Get booking parameters
    const bookDate = ref<string>("")
    const bookStartTime = ref<number>(14)
    const bookDuration = ref<number>(1)
    const bookType = ref<"solo" | "band">("solo")

    // Get state parameters
    const roomsGenerated = ref(false)
    const loading = ref(false) //Initialise as true 
    const error = ref("")
    const success = ref("")

    // Get rooms list 
    const rooms = ref<Room[]>([])
    const selectedRoom = ref<Room|null>()

    // Start Function
    onMounted(()=> {

    })

    // Generate Rooms
    async function generateRooms() {
        try {
            // Start Loading
            roomsGenerated.value = true
            loading.value = true 
            error.value = ""
            rooms.value = []
            success.value = ""

            // Try to generate a roomlist based on our parameters
            const booking = buildPossibleBooking()

            // Is our booking not null?
            if (booking) {
                rooms.value = await getRoomsForBooking(booking)
                if (rooms && rooms.value.length > 0) {
                    // Unset loading, display rooms
                    loading.value = false
                    error.value = ""
                }
                else {
                    // Unset loading, display error
                    loading.value = false 
                    error.value = "No rooms found matching that criteria."
                }
            }
            else {
                throw new Error("Invalid booking parameters.")
            }
        }
        catch (err:any) {
            loading.value = false
            error.value = err.message
            rooms.value = []
        }
    }

    // Build a 'PossibleBooking' from our form data
    function buildPossibleBooking() : PossibleBooking | null {
        try {
            // Create a Date from the 'date' input 
            const startTime = new Date(bookDate.value)

            // Set the starting hour
            startTime.setHours(bookStartTime.value,0,0,0)

            // Clone it to create an 'endTime' Date object 
            const endTime = new Date(startTime)

            // Add the duration to endTime
            endTime.setHours(endTime.getHours() + bookDuration.value)

            // Return 
            return {
                type:bookType.value,
                startTime:startTime.toISOString(),
                endTime:endTime.toISOString()
            } as PossibleBooking
        }
        catch (err:any) {
            return null
        }
    }

    // Modal State (create / edit room popup modal)
    const showModal = ref(false)
    function openModal(room:Room, app:PossibleBooking|null) {
        selectedRoom.value = room ?? null
        showModal.value = true
    }
    function closeModal() {
        showModal.value = false
        selectedRoom.value = null
    }
    function getSuccess() {
        success.value = "Booking made successfully!"
        error.value = ""
        rooms.value = []
    }

    // Load a specific room in Rooms/View
    function viewRoom(roomId:string) {
        router.push(`/rooms/${roomId}`)
    }
</script>

<template>
    <!-- Header -->
     <h1 class="mb-4">Make a Booking</h1>

    <!-- Content Row -->
     <div class="row g-3 mb-4">
        <!-- Left Card: Booking Data -->
        <div class="col-md-4">
            <div class="card p-3">
                <h5 class="text-center">Booking Information</h5>
                    <!-- Get the Date -->
                   <div class="row align-items-center mb-3">
                        <label for="date" class="col-sm-4 col-form-label">Booking Date: </label>
                        <div class="col-sm-8">
                            <input v-model="bookDate" id="date" type="date" class="form-control" required/>
                        </div>
                   </div>

                   <!-- Get the Start Time -->
                   <div class="row align-items-center mb-3">
                        <label for="starttime" class="col-sm-4 col-form-label">Start Time (24hr): </label>
                        <div class="col-sm-8">
                            <input v-model="bookStartTime" id="starttime" type="number" min="0" max="23" class="form-control" placeholder="0-23" required/>
                        </div>
                   </div>

                   <!-- Get the Booking Duration -->
                   <div class="row align-items-center mb-3">
                        <label for="duration" class="col-sm-4 col-form-label">Duration (Hours): </label>
                        <div class="col-sm-8">
                            <input v-model="bookDuration" id="duration" type="number" min="1" max="24" class="form-control" placeholder="1-24" required/>
                        </div>
                   </div>

                   <!-- Get the Booking Type -->
                   <div class="row align-items-center mb-3">
                        <label for="bookType" class="col-sm-4 col-form-label">Booking Type: </label>
                        <div class="col-sm-8">
                            <select id="bookType" class="form-select" v-model="bookType" required>
                                <option value="solo">Solo</option>
                                <option value="band">Band</option>
                            </select>
                        </div>
                   </div>

                   <!-- Select a Band -->
                    <div class="row align-items-center mb-3" v-if="bookType === 'band'">
                        <label for="bookBand" class="col-sm-4 col-form-label">Band: </label>
                        <div class="col-sm-8">
                            <select id="bookBand" class="form-select" required>
                                <option value="solo">Select a Band...</option>
                            </select>
                        </div>
                   </div>

                   <!-- Find Rooms Button -->
                    <div class="row align-items-center mb-3" @click="generateRooms()">
                        <button id="findRooms" class="btn btn-lg btn-primary">Find Rooms</button>
                    </div>
            </div>
        </div>
 

        <!-- Right Card: Room Selection -->
        <div class="col-md-4">
            <div class="card p-3">
                <h5 class="text-center">Available Rooms</h5>
                <!-- Success Message -->
                <div v-if="success" class="alert alert-success">{{ success }}</div>

                <!-- Loading Message -->
                <div v-else-if="loading">
                    Loading Rooms... Please Wait.
                </div>

                <!-- Error Message -->
                <div v-else-if="error" class="alert alert-danger">
                    {{ error }}
                </div>

                <!-- Room Display Table -->
                 <table v-else-if="rooms.length > 0" class="table table-striped">
                    <!-- Column Headers -->
                     <thead>
                        <tr>
                            <th>Room Name</th>
                            <th>Actions</th>
                        </tr>
                     </thead>

                     <!-- Table Body -->
                      <tbody>
                        <tr v-for="room in rooms" :key="room.id">
                            <td>{{ room.name }}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary me-2" @click="viewRoom(room.id)">View</button>
                                <button class="btn btn-sm btn-primary" @click="openModal(room,buildPossibleBooking())">Book</button>
                            </td>
                        </tr>
                      </tbody>
                 </table>
            </div>
        </div>
     </div>

    <!-- Booking Modal -->
    <BookingModal v-if="selectedRoom && buildPossibleBooking() && rooms.length > 0" @close="closeModal" @accept="getSuccess" :room-data="selectedRoom" :booking-data="buildPossibleBooking()"/>
</template>