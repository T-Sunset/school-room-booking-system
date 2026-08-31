<script setup lang="ts">
    // BookingsView.vue
    // Imports
    import {computed, ref, onMounted} from 'vue'
    import type { BookingRequest, PossibleBooking } from '../types/Booking'
    import type { Room } from '../types/Room'
    import { approveBooking, cancelBooking, denyBooking, getBookings, getPendingBookings } from '../services/bookingService'
    import { getRooms, getRoomsForBooking } from '../services/roomService'
    import { getActiveBands, getBandsForUser, getSameSchoolUsers } from '../services/bandService'
    import { useAuthStore } from '../stores/authStore'
    import type { Band } from '../types/Band'
    import BookingModal from '../components/BookingModal.vue'
    import { useRouter } from 'vue-router'

    // Get Router
    const router = useRouter()
    const authStore = useAuthStore()

    // Get booking parameters
    const bookDate = ref<string>("")
    const bookStartTime = ref<number>(14)
    const bookDuration = ref<number>(1)
    const bookType = ref<"solo" | "band">("solo")
    const selectedBandId = ref("")

    // Get state parameters
    const roomsGenerated = ref(false)
    const loading = ref(false) //Initialise as true 
    const error = ref("")
    const success = ref("")
    const bands = ref<Band[]>([])
    const bandsLoading = ref(false)
    const selectedBandName = computed(() => bands.value.find((band) => band.id === selectedBandId.value)?.name || "")
    const bookings = ref<BookingRequest[]>([])
    const roomNames = ref<Record<string, string>>({})
    const userNames = ref<Record<string, string>>({})
    const bandNames = ref<Record<string, string>>({})
    const bookingsLoading = ref(false)
    const bookingsError = ref("")
    const pendingBookings = ref<BookingRequest[]>([])
    const pendingBookingsLoading = ref(false)
    const pendingBookingsError = ref("")
    const pendingBookingsSuccess = ref("")
    const bookingActionId = ref("")
    const showBookingHistory = ref(false)
    const bookingSort = ref<"soonest" | "latest">("soonest")
    const bookingSuccess = ref("")
    const cancellationBooking = ref<BookingRequest | null>(null)
    const cancellationLoading = ref(false)
    const isStaff = authStore.role === "teacher" || authStore.role === "admin"
    const displayedBookings = computed(() => {
        const now = new Date()
        const filtered = bookings.value.filter((booking) => {
            if (showBookingHistory.value) return true
            return booking.status !== "denied" && booking.status !== "cancelled" && new Date(booking.endTime) > now
        })

        return filtered.sort((first, second) => {
            const firstTime = new Date(first.startTime).getTime()
            const secondTime = new Date(second.startTime).getTime()
            return bookingSort.value === "soonest" ? firstTime - secondTime : secondTime - firstTime
        })
    })

    function canCancelBooking(booking: BookingRequest): boolean {
        if (booking.createdBy !== authStore.uid) return false
        if (booking.status !== "pending" && booking.status !== "waitlisted" && booking.status !== "approved") return false
        return new Date(booking.startTime) > new Date()
    }

    function bookingStatusLabel(status: BookingRequest["status"]): string {
        return status === "cancelled" ? "Cancelled" : status
    }

    // Get rooms list 
    const rooms = ref<Room[]>([])
    const selectedRoom = ref<Room|null>()
    const startTimeMinimum = computed(() => selectedRoom.value?.rules.openHour ?? 0)
    const startTimeMaximum = computed(() => (selectedRoom.value?.rules.closeHour ?? 24) - 0.5)
    const maximumDurationHours = computed(() => {
        if (!selectedRoom.value) return 24
        return Math.min(selectedRoom.value.rules.maxBookingHours, selectedRoom.value.rules.closeHour - bookStartTime.value)
    })

    // Start Function
    onMounted(async ()=> {
        if (isStaff) {
            pendingBookingsLoading.value = true
            try {
                const [pending, availableRooms, schoolUsers, activeBands] = await Promise.all([
                    getPendingBookings(),
                    getRooms(),
                    getSameSchoolUsers(),
                    getActiveBands()
                ])
                pendingBookings.value = pending
                roomNames.value = Object.fromEntries((availableRooms as Room[]).map((room) => [room.id, room.name]))
                userNames.value = Object.fromEntries(schoolUsers.map((user) => [user.id, user.email]))
                bandNames.value = Object.fromEntries(activeBands.map((band) => [band.id, band.name]))
            }
            catch (err:any) {
                pendingBookingsError.value = err.response?.data?.error || err.message || "Unable to load pending bookings."
            }
            finally {
                pendingBookingsLoading.value = false
            }
            return
        }

        if (authStore.role !== "student") return

        bandsLoading.value = true
        bookingsLoading.value = true
        try {
            const [userBands, userBookings, availableRooms] = await Promise.all([getBandsForUser(), getBookings(), getRooms()])
            bands.value = userBands.filter((band) => band.status === "approved")
            bandNames.value = Object.fromEntries(userBands.map((band) => [band.id, band.name]))
            bookings.value = userBookings
            roomNames.value = Object.fromEntries((availableRooms as Room[]).map((room) => [room.id, room.name]))
        }
        catch (err:any) {
            bookingsError.value = err.response?.data?.error || err.message || "Unable to load your bookings."
        }
        finally {
            bandsLoading.value = false
            bookingsLoading.value = false
        }
    })

    function openCancellation(booking: BookingRequest) {
        if (!canCancelBooking(booking) || cancellationLoading.value) return
        bookingSuccess.value = ""
        bookingsError.value = ""
        cancellationBooking.value = booking
    }

    function closeCancellation() {
        if (cancellationLoading.value) return
        cancellationBooking.value = null
    }

    async function confirmCancellation() {
        const booking = cancellationBooking.value
        if (!booking || cancellationLoading.value) return

        cancellationLoading.value = true
        bookingsError.value = ""
        bookingSuccess.value = ""
        try {
            const response = await cancelBooking(booking.id)
            bookings.value = await getBookings()
            cancellationBooking.value = null
            bookingSuccess.value = response.status === "cancelled" ? "Booking cancelled." : "Booking updated."
        }
        catch (err:any) {
            bookingsError.value = err.response?.data?.error || err.message || "Unable to cancel this booking."
        }
        finally {
            cancellationLoading.value = false
        }
    }

    function handleBookingTypeChange() {
        if (bookType.value === "solo") selectedBandId.value = ""
        resetAvailableRooms()
    }

    function resetAvailableRooms() {
        rooms.value = []
        selectedRoom.value = null
        roomsGenerated.value = false
        loading.value = false
        success.value = ""
    }

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
            if (bookType.value === "band" && !selectedBandId.value) {
                throw new Error("Please select a band before finding rooms.")
            }
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
            const [year, month, day] = bookDate.value.split("-").map(Number)
            if (!year || !month || !day || !Number.isInteger(bookStartTime.value * 2) || !Number.isInteger(bookDuration.value * 2)) {
                return null
            }

            const startTime = new Date(year, month - 1, day)
            if (startTime.getFullYear() !== year || startTime.getMonth() !== month - 1 || startTime.getDate() !== day) {
                return null
            }

            const startHour = Math.floor(bookStartTime.value)
            const startMinute = (bookStartTime.value - startHour) * 60
            startTime.setHours(startHour, startMinute, 0, 0)

            // Clone it to create an 'endTime' Date object 
            const endTime = new Date(startTime)

            endTime.setMinutes(endTime.getMinutes() + bookDuration.value * 60)

            // Return 
            return {
                type:bookType.value,
                startTime:startTime.toISOString(),
                endTime:endTime.toISOString(),
                ...(bookType.value === "band" ? { bandId: selectedBandId.value } : {})
            } as PossibleBooking
        }
        catch (err:any) {
            return null
        }
    }

    // Modal State (create / edit room popup modal)
    const showModal = ref(false)
    function openModal(room:Room) {
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

    async function approvePendingBooking(booking: BookingRequest) {
        await updatePendingBooking(booking, approveBooking, "approved")
    }

    async function denyPendingBooking(booking: BookingRequest) {
        if (!window.confirm("Are you sure you want to deny this booking?")) return
        await updatePendingBooking(booking, denyBooking, "denied")
    }

    async function updatePendingBooking(booking: BookingRequest, action: (bookingId: string) => Promise<{ status: BookingRequest['status'] }>, status: BookingRequest['status']) {
        if (bookingActionId.value) return
        bookingActionId.value = booking.id
        pendingBookingsError.value = ""
        pendingBookingsSuccess.value = ""
        try {
            const response = await action(booking.id)
            if (response.status === status) {
                pendingBookings.value = pendingBookings.value.filter((pending) => pending.id !== booking.id)
                pendingBookingsSuccess.value = `Booking was ${status}.`
            }
        }
        catch (err:any) {
            pendingBookingsError.value = err.response?.data?.error || err.message || `Unable to ${status} the booking.`
        }
        finally {
            bookingActionId.value = ""
        }
    }

    // Load a specific room in Rooms/View
    function viewRoom(roomId:string) {
        router.push(`/rooms/${roomId}`)
    }
</script>

<template>
    <!-- Header -->
     <div class="view-header">
        <div>
            <h1>Make a Booking</h1>
            <p class="section-description mb-0">Choose a time and find a room that fits.</p>
        </div>
     </div>
    <div v-if="pendingBookingsSuccess" class="alert alert-success">{{ pendingBookingsSuccess }}</div>

    <!-- Content Row -->
     <div class="row g-3 mb-4">
        <!-- Left Card: Booking Data -->
        <div class="col-lg-5">
            <div class="card p-3 booking-form-panel">
                <h2 class="section-heading">Booking Information</h2>
                    <!-- Get the Date -->
                   <div class="row align-items-center mb-3">
                        <label for="date" class="col-sm-4 col-form-label">Booking Date: </label>
                        <div class="col-sm-8">
                            <input v-model="bookDate" @input="resetAvailableRooms" id="date" type="date" class="form-control" required/>
                        </div>
                   </div>

                   <!-- Get the Start Time -->
                   <div class="row align-items-center mb-3">
                        <label for="starttime" class="col-sm-4 col-form-label">Start Time (24hr): </label>
                        <div class="col-sm-8">
                            <input v-model.number="bookStartTime" @input="resetAvailableRooms" id="starttime" type="number" :min="startTimeMinimum" :max="startTimeMaximum" step="0.5" class="form-control" placeholder="0-23.5" required/>
                        </div>
                   </div>

                   <!-- Get the Booking Duration -->
                   <div class="row align-items-center mb-3">
                        <label for="duration" class="col-sm-4 col-form-label">Duration (Hours): </label>
                        <div class="col-sm-8">
                            <input v-model.number="bookDuration" @input="resetAvailableRooms" id="duration" type="number" min="0.5" :max="maximumDurationHours" step="0.5" class="form-control" placeholder="0.5-24" required/>
                        </div>
                   </div>

                   <!-- Get the Booking Type -->
                   <div class="row align-items-center mb-3">
                        <label for="bookType" class="col-sm-4 col-form-label">Booking Type: </label>
                        <div class="col-sm-8">
                            <select id="bookType" class="form-select" v-model="bookType" @change="handleBookingTypeChange" required>
                                <option value="solo">Solo</option>
                                <option value="band">Band</option>
                            </select>
                        </div>
                   </div>

                   <!-- Select a Band -->
                    <div class="row align-items-center mb-3" v-if="bookType === 'band'">
                        <label for="bookBand" class="col-sm-4 col-form-label">Band: </label>
                        <div class="col-sm-8">
                            <select id="bookBand" class="form-select" v-model="selectedBandId" @change="resetAvailableRooms" :disabled="bandsLoading || bands.length === 0" required>
                                <option value="" disabled>{{ bandsLoading ? "Loading bands..." : "Select a Band..." }}</option>
                                <option v-for="band in bands" :key="band.id" :value="band.id">{{ band.name }}</option>
                            </select>
                            <small v-if="!bandsLoading && bands.length === 0" class="text-muted">You have no approved bands available for booking.</small>
                        </div>
                   </div>

                   <!-- Find Rooms Button -->
                    <div class="row align-items-center mb-3" @click="generateRooms()">
                        <button id="findRooms" class="btn btn-lg btn-primary">Find Rooms</button>
                    </div>
            </div>
        </div>
 

        <!-- Right Card: Room Selection -->
        <div class="col-lg-7">
            <div class="card p-3 table-responsive">
            <h2 class="section-heading">Available Rooms</h2>
                <!-- Success Message -->
                <div v-if="success" class="alert alert-success">{{ success }}</div>

                <!-- Loading Message -->
                <div v-else-if="loading" class="loading-state" role="status">
                    Loading Rooms... Please Wait.
                </div>

                <!-- Error Message -->
                <div v-else-if="error" class="alert alert-danger">
                    {{ error }}
                </div>

                <!-- Room Display Table -->
                 <table v-else-if="rooms.length > 0" class="table table-striped table-sm data-table">
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
                                <button class="btn btn-sm btn-primary" @click="openModal(room)">Book</button>
                            </td>
                        </tr>
                      </tbody>
                 </table>
            </div>
        </div>
     </div>

    <!-- Booking Modal -->
    <BookingModal v-if="selectedRoom && buildPossibleBooking() && rooms.length > 0" @close="closeModal" @accept="getSuccess" :room-data="selectedRoom" :booking-data="buildPossibleBooking()" :band-name="selectedBandName"/>

        <section v-if="authStore.role === 'student'" class="mt-4">
            <div class="section-header">
                <h2 class="h4">My Bookings</h2>
            </div>
            <div v-if="bookingSuccess" class="alert alert-success">{{ bookingSuccess }}</div>
            <div v-if="bookingsError" class="alert alert-danger">{{ bookingsError }}</div>
            <div v-else-if="bookingsLoading" class="loading-state" role="status">Loading your bookings...</div>
            <div v-else class="card p-3">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div class="form-check">
                        <input id="showBookingHistory" v-model="showBookingHistory" type="checkbox" class="form-check-input">
                        <label for="showBookingHistory" class="form-check-label">Show booking history</label>
                    </div>
                    <label for="bookingSort" class="visually-hidden">Sort bookings</label>
                    <select id="bookingSort" v-model="bookingSort" class="form-select" style="max-width: 12rem">
                        <option value="soonest">Soonest first</option>
                        <option value="latest">Latest first</option>
                    </select>
                </div>

                <div v-if="displayedBookings.length === 0" class="empty-state">
                    {{ showBookingHistory ? 'You have no bookings.' : 'You have no upcoming bookings.' }}
                </div>
                <div v-else class="table-responsive">
                    <table class="table table-striped table-sm data-table mb-0">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Room</th>
                                <th>Band Name</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="booking in displayedBookings" :key="booking.id">
                                <td>{{ booking.type === 'band' ? 'Band' : 'Solo' }}</td>
                                <td>{{ booking.roomName || roomNames[booking.roomId] || "Room unavailable" }}</td>
                                <td>{{ booking.type === 'band' ? (bandNames[booking.bandId || ''] || "Band unavailable") : "-" }}</td>
                                <td>{{ new Date(booking.startTime).toLocaleString() }}</td>
                                <td>{{ new Date(booking.endTime).toLocaleString() }}</td>
                                <td><span class="status-badge" :class="`status-${booking.status}`">{{ bookingStatusLabel(booking.status) }}</span></td>
                                <td>
                                    <button v-if="canCancelBooking(booking)" class="btn btn-sm btn-outline-danger" @click="openCancellation(booking)">
                                        Cancel
                                    </button>
                                    <span v-else class="text-muted">-</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <div v-if="cancellationBooking" class="modal-backdrop-custom" @click.self="closeCancellation">
            <div class="modal-dialog-custom cancellation-dialog" role="dialog" aria-modal="true" aria-labelledby="cancellation-modal-title">
                <div class="card p-4 modal-card">
                    <h2 id="cancellation-modal-title" class="h4">Cancel booking?</h2>
                    <dl class="mb-4">
                        <dt>Room</dt>
                        <dd>{{ cancellationBooking.roomName || roomNames[cancellationBooking.roomId] || "Room unavailable" }}</dd>
                        <dt>Date</dt>
                        <dd>{{ new Date(cancellationBooking.startTime).toLocaleDateString() }}</dd>
                        <dt>Time</dt>
                        <dd>{{ new Date(cancellationBooking.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }}–{{ new Date(cancellationBooking.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }}</dd>
                    </dl>
                    <p class="text-muted">This booking will be cancelled and cannot be restored.</p>
                    <div v-if="bookingsError" class="alert alert-danger" role="alert">{{ bookingsError }}</div>
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-secondary" :disabled="cancellationLoading" @click="closeCancellation">Keep Booking</button>
                        <button class="btn btn-danger" :disabled="cancellationLoading" @click="confirmCancellation">
                            <span v-if="cancellationLoading" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                            {{ cancellationLoading ? "Cancelling..." : "Cancel Booking" }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <section v-if="isStaff" class="mt-4">
            <div class="section-header">
                <h2 class="h4">Pending Bookings</h2>
            </div>
            <div v-if="pendingBookingsError" class="alert alert-danger">{{ pendingBookingsError }}</div>
            <div v-else-if="pendingBookingsLoading" class="loading-state" role="status">Loading pending bookings...</div>
            <div v-else-if="pendingBookings.length === 0" class="empty-state">There are no pending bookings.</div>
            <div v-else class="card data-card table-responsive">
                <table class="table table-striped table-sm data-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Room</th>
                            <th>Student/Band</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="booking in pendingBookings" :key="booking.id">
                            <td>{{ booking.type === 'band' ? 'Band' : 'Solo' }}</td>
                            <td>{{ booking.roomName || roomNames[booking.roomId] || "Room unavailable" }}</td>
                            <td>{{ booking.type === 'band' ? (booking.bandName || bandNames[booking.bandId || ''] || 'Band unavailable') : (booking.requesterEmail || userNames[booking.createdBy] || 'Student unavailable') }}</td>
                            <td>{{ new Date(booking.startTime).toLocaleString() }}</td>
                            <td>{{ new Date(booking.endTime).toLocaleString() }}</td>
                            <td><span class="status-badge" :class="`status-${booking.status}`">{{ booking.status }}</span></td>
                            <td>
                                <button class="btn btn-sm btn-success me-2" :disabled="bookingActionId !== ''" @click="approvePendingBooking(booking)">Approve</button>
                                <button class="btn btn-sm btn-danger" :disabled="bookingActionId !== ''" @click="denyPendingBooking(booking)">Deny</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
</template>