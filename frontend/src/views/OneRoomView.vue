<script setup lang="ts">
    // OneRoomView.vue
    // Imports
    import { useRoute } from 'vue-router';
    import { useRouter } from 'vue-router';
    import {computed, ref, onMounted} from 'vue';
    import type { PossibleBooking } from '../types/Booking';
    import type { Room } from '../types/Room';
    import { getRoomAvailability, getRoomSingle } from '../services/roomService';
    import type { RoomAvailabilityCell } from '../types/Room';
    import BookingModal from '../components/BookingModal.vue';

    // Get the Room ID selected from the Rooms view
    const route = useRoute() // Use the router
    const router = useRouter()
    const roomId = route.params.id 
    const room = ref<Room | null>(null) // Room or null

    // Are we loading?
    const loading = ref(true) //Initialise as true 

    // Do we have an error?
    const error = ref("")
    const availability = ref<RoomAvailabilityCell[]>([])
    const selectedBooking = ref<PossibleBooking | null>(null)
    const selectedDay = ref(1)
    const bookingFeedback = ref("")
    const bookingFeedbackType = ref<"success" | "danger">("success")

    // On page load / Start function
    onMounted(async () => {
        // Try to fetch the room according to RoomID if possible.
        try {
            const [res, roomAvailability] = await Promise.all([
                getRoomSingle(roomId),
                getRoomAvailability(roomId)
            ])
            room.value = {
                ...res,
                id: String(roomId)
            }
            availability.value = roomAvailability
        } catch (err:any) {
            // Report on any errors if they occur
            console.log(err.response?.data)
            error.value = err.response?.data || "Failed to load rooms."
        }
        finally {
            loading.value = false
        }
    })

    // Define days
    const days = [
        {label:"Sunday", value:0},
        {label:"Monday", value:1},
        {label:"Tuesday", value:2},
        {label:"Wednesday", value:3},
        {label:"Thursday", value:4},
        {label:"Friday", value:5},
        {label:"Saturday", value:6}
    ]

    // Define yearlevels
    const yearLevels = [
        {label:"Year 7", value:7},
        {label:"Year 8", value:8},
        {label:"Year 9", value:9},
        {label:"Year 10", value:10},
        {label:"Year 11", value:11},
        {label:"Year 12", value:12}
    ]

    const timeSlots = computed(() => {
        const slots = new Map<number, RoomAvailabilityCell>()
        availability.value.forEach((cell) => {
            if (!slots.has(cell.hour)) slots.set(cell.hour, cell)
        })
        return [...slots.values()].sort((first, second) => first.startTime.localeCompare(second.startTime))
    })

    const availabilityBySlot = computed(() => new Map(
        availability.value.map((cell) => [`${cell.day}-${cell.hour}`, cell])
    ))

    function getCell(day: number, hour: number) {
        return availabilityBySlot.value.get(`${day}-${hour}`)
    }

    function getCellStatus(day: number, hour: number) {
        return getCell(day, hour)?.status || "unavailable"
    }

    function formatCellTime(startTime: string) {
        const date = new Date(startTime)
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    }

    function formatCellInterval(cell: RoomAvailabilityCell | undefined) {
        if (!cell) return "No scheduled interval"
        return `${formatCellTime(cell.startTime)}-${formatCellTime(cell.endTime)}`
    }

    function statusLabel(status: RoomAvailabilityCell["status"]) {
        return status === "available" ? "Available" : status === "booked" ? "Booked" : "Unavailable"
    }

    function statusSymbol(status: RoomAvailabilityCell["status"]) {
        return status === "available" ? "✓" : status === "booked" ? "●" : "×"
    }

    function canBookCell(day: number, hour: number) {
        const cell = getCell(day, hour)
        return cell?.status === "available" && new Date(cell.startTime) > new Date()
    }

    function openCellBooking(day: number, hour: number) {
        const cell = getCell(day, hour)
        if (!cell || !canBookCell(day, hour)) return

        selectedBooking.value = {
            type: "solo",
            startTime: cell.startTime,
            endTime: cell.endTime
        }
    }

    function closeCellBooking() {
        selectedBooking.value = null
    }

    async function handleBookingSuccess() {
        bookingFeedbackType.value = "success"
        bookingFeedback.value = "Booking submitted successfully."
        selectedBooking.value = null
        availability.value = await getRoomAvailability(roomId)
    }

    function handleBookingError(message: string) {
        bookingFeedbackType.value = "danger"
        bookingFeedback.value = message
    }
</script>

<template>
    <div v-if="loading" class="view-header">
        <h1>Room</h1>
    </div>

    <!-- Loading Message -->
    <div v-if="loading" class="loading-state" role="status">
        Loading Rooms... Please Wait.
     </div>

    <!-- Error Message -->
     <div v-else-if="error" class="alert alert-danger">
        {{ error }}
     </div>
    
     <div v-if="!loading && room" class="view-header">
        <div>
            <h1>{{ room.name }}</h1>
            <p class="section-description mb-0">Room availability and booking rules.</p>
        </div>
        <button type="button" class="btn btn-outline-primary" @click="router.push('/rooms')">Back to rooms</button>
     </div>
        <div v-if="bookingFeedback" class="alert" :class="`alert-${bookingFeedbackType}`">{{ bookingFeedback }}</div>

    <!-- Header Information Cards -->
    <div class="row g-3 mb-4 room-summary-grid">
        <!-- Accepting Bookings? -->
        <div class="col-sm-4">
            <div class="card p-3 text-center">
                <h5>Accepting Bookings?</h5>
                <p class="display-6" v-if="room?.isBookable">Bookings Available</p>
                <p class="display-6" v-else>Bookings Unavailable</p>
            </div>
        </div>

        <!-- Max Booking Hours -->
        <div class="col-sm-4">
            <div class="card p-3 text-center">
                <h5>Max Booking Length</h5>
                <p class="display-6">{{room?.rules.maxBookingHours}} Hours</p>
            </div>
        </div>

        <!-- Booking Hours -->
        <div class="col-sm-4">
            <div class="card p-3 text-center">
                <h5>Open Hours (24hr)</h5>
                <p class="display-6">{{room?.rules.openHour}}:00 - {{ room?.rules.closeHour }}:00</p>
            </div>
        </div>
     </div>
     
    <div class="row g-3">
        <!-- Allowed Days -->
        <div class="col-sm-4">
            <div class="card p-3 text-center">
                <h5>Available Days</h5>
                <div v-for="day in room?.rules.allowedDays" :key="day">
                    <p>{{ days.find(d => d.value === day)?.label }}</p>
                </div>
            </div>
        </div>

        <!-- Allowed Year Levels -->
        <div class="col-sm-4">
            <div class="card p-3 text-center">
                <h5>Available Year Levels:</h5>
                <div v-for="yl in room?.rules.allowedYearLevels" :key="yl">
                    <p>{{ yearLevels.find(y=>y.value === yl)?.label }}</p>
                </div>
            </div>
        </div>

         <!-- Agreement -->
        <div class="col-sm-4">
            <div class="card p-3 text-center">
                <h5>Booking Rules</h5>
                <p class="text-wrap-anywhere mb-0">{{ room?.rules.agreement }}</p>
            </div>
        </div>
     </div>

     <!-- Rule Break -->
      <hr/>

     <!-- Booking timetable: transposed on larger screens to keep the school week compact. -->
     <section class="room-timetable" aria-label="Room availability timetable">
        <div class="room-timetable-toolbar">
            <h2 class="room-timetable-title">Weekly availability</h2>
            <div class="room-timetable-legend" aria-label="Timetable legend">
                <span><strong class="room-timetable-legend-symbol room-timetable-legend-available" aria-hidden="true">✓</strong> Available</span>
                <span><strong class="room-timetable-legend-symbol room-timetable-legend-booked" aria-hidden="true">●</strong> Booked</span>
                <span><strong class="room-timetable-legend-symbol room-timetable-legend-unavailable" aria-hidden="true">×</strong> Unavailable</span>
            </div>
        </div>
        <div class="room-timetable-desktop" role="region" aria-label="Weekly room availability" tabindex="0">
            <table class="table table-bordered room-timetable-grid">
                <thead>
                    <tr>
                        <th scope="col" class="room-timetable-day-header">Day</th>
                        <th v-for="slot in timeSlots" :key="slot.startTime" scope="col" class="room-timetable-time-header">
                            {{ formatCellTime(slot.startTime) }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="day in days" :key="day.value">
                        <th scope="row" class="room-timetable-day-label">{{ day.label }}</th>
                        <td v-for="slot in timeSlots" :key="`${day.value}-${slot.hour}`" class="room-timetable-cell">
                            <button
                                v-if="canBookCell(day.value, slot.hour)"
                                type="button"
                                class="room-timetable-action room-timetable-action-available"
                                :aria-label="`${day.label}, ${formatCellInterval(getCell(day.value, slot.hour))}, available`"
                                :title="`${day.label}, ${formatCellInterval(getCell(day.value, slot.hour))}, available`"
                                @click="openCellBooking(day.value, slot.hour)">
                                <span class="room-timetable-symbol" aria-hidden="true">{{ statusSymbol(getCellStatus(day.value, slot.hour)) }}</span>
                            </button>
                            <span
                                v-else
                                class="room-timetable-state"
                                :class="`room-timetable-state-${getCellStatus(day.value, slot.hour)}`"
                                role="img"
                                :aria-label="`${day.label}, ${formatCellInterval(getCell(day.value, slot.hour))}, ${statusLabel(getCellStatus(day.value, slot.hour))}`"
                                :title="`${day.label}, ${formatCellInterval(getCell(day.value, slot.hour))}, ${statusLabel(getCellStatus(day.value, slot.hour))}`">
                                <span class="room-timetable-symbol" aria-hidden="true">{{ statusSymbol(getCellStatus(day.value, slot.hour)) }}</span>
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="room-timetable-mobile">
            <div class="room-day-selector" role="group" aria-label="Choose a day">
                <button
                    v-for="day in days"
                    :key="day.value"
                    type="button"
                    class="btn btn-outline-primary room-day-selector-button"
                    :class="{ active: selectedDay === day.value }"
                    :aria-pressed="selectedDay === day.value"
                    @click="selectedDay = day.value">
                    {{ day.label }}
                </button>
            </div>

            <div class="room-mobile-schedule" role="region" :aria-label="`${days.find(day => day.value === selectedDay)?.label} room availability`">
                <div v-for="slot in timeSlots" :key="`${selectedDay}-${slot.hour}`" class="room-mobile-slot">
                    <div class="room-mobile-slot-time">
                        <strong>{{ formatCellTime(slot.startTime) }}</strong>
                        <span>{{ formatCellTime(slot.endTime) }}</span>
                    </div>
                    <button
                        v-if="canBookCell(selectedDay, slot.hour)"
                        type="button"
                        class="room-timetable-action room-timetable-action-available room-mobile-slot-state"
                        :aria-label="`${days.find(day => day.value === selectedDay)?.label}, ${formatCellInterval(getCell(selectedDay, slot.hour))}, available`"
                        :title="`${days.find(day => day.value === selectedDay)?.label}, ${formatCellInterval(getCell(selectedDay, slot.hour))}, available`"
                        @click="openCellBooking(selectedDay, slot.hour)">
                        <span class="room-timetable-symbol" aria-hidden="true">{{ statusSymbol(getCellStatus(selectedDay, slot.hour)) }}</span>
                    </button>
                    <span
                        v-else
                        class="room-timetable-state room-mobile-slot-state"
                        :class="`room-timetable-state-${getCellStatus(selectedDay, slot.hour)}`"
                        role="img"
                        :aria-label="`${days.find(day => day.value === selectedDay)?.label}, ${formatCellInterval(getCell(selectedDay, slot.hour))}, ${statusLabel(getCellStatus(selectedDay, slot.hour))}`"
                        :title="`${days.find(day => day.value === selectedDay)?.label}, ${formatCellInterval(getCell(selectedDay, slot.hour))}, ${statusLabel(getCellStatus(selectedDay, slot.hour))}`">
                        <span class="room-timetable-symbol" aria-hidden="true">{{ statusSymbol(getCellStatus(selectedDay, slot.hour)) }}</span>
                    </span>
                </div>
            </div>
        </div>
     </section>

     <BookingModal
        v-if="room && selectedBooking"
        :room-data="room"
        :booking-data="selectedBooking"
        @close="closeCellBooking"
        @accept="handleBookingSuccess"
        @error="handleBookingError" />
</template>