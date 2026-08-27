<script setup lang="ts">
    // DashboardView.vue
    import {ref, onMounted, computed} from 'vue'
    import type { BookingRequest } from '../types/Booking'
    import { getStartOfWeek } from '../types/Booking'
    import type { Room } from '../types/Room'
    import { getRooms } from '../services/roomService'
    import { useAuthStore } from '../stores/authStore'

    // Declare variables 
    // Booking Related
    const bookings = ref<BookingRequest[]>([]) // Reactive Data declaration w/ initial value. Initialised as an empty array.
    const pendingBookings = computed(() => {
        return bookings.value.filter(booking => booking.status === "pending" || booking.status === "waitlisted")
    })
    const myBookingsThisWeek = computed(() => {
        const startOfWeek = getStartOfWeek()

        return bookings.value.filter(booking => {
            const created = new Date(booking.createdAt)
            return (created >= startOfWeek)
        })
    })

    // Rooms Related 
    let rooms = ref<Room[]>([])
    const roomCount = computed(() => {return rooms.value.length})
    const authStore = useAuthStore()

    // OnMounted() is equivalent to our _ready() or Start() functions. Runs on mount 
    onMounted(async() => {
        // Get our rooms from back-end
        try {
            rooms = ref<Room[]>(await getRooms())
        } catch (err:any) {
            console.log(err.response?.data)
        }
        
        // Set dummy data for bookings 
        bookings.value = [
            {
                id:"",
                roomId:"Music Room A",
                createdBy:"",
                type:"solo",
                startTime:"Monday 3:00 PM",
                endTime:"Monday 4:00 PM",
                status:"approved",
                reason:"First solo booking of the week is automatically approved.",
                approvedBy: "Automatic",
                approvedAt: new Date().toISOString(),
                schoolId:"",
                createdAt:new Date().toISOString()
            },
            {
                id:"",
                roomId:"Music Room B",
                createdBy:"",
                type:"solo",
                startTime:"Tuesday 1:00 PM",
                endTime:"Tuesday 2:00 PM",
                status:"waitlisted",
                reason:"Solo bookings after the first per week are put onto the waitlist automatically.",
                approvedBy: "Automatic",
                approvedAt: new Date().toISOString(),
                schoolId:"",
                createdAt:new Date().toISOString()
            },
        ]
    })
</script>

<template>
    <div>
        <h1 class="mb-4">Dashboard</h1>

        <div v-if="authStore.role === 'student' && authStore.strikeStatus.isBanned" class="alert alert-danger" role="alert">
            You are currently banned from making new bookings until {{ new Date(authStore.strikeStatus.banExpiresAt as string).toLocaleString() }}.
        </div>
        <div v-else-if="authStore.role === 'student' && authStore.strikeStatus.hasWarning" class="alert alert-warning" role="alert">
            You have received a strike. This is currently a warning; you are not banned from making bookings.
        </div>

        <!-- Top Row -->
        <div class="row g-3 mb-4">
            <!-- Header Information Cards -->
            <div class="col-md-4">
                <div class="card p-3 text-center">
                    <h5>My Bookings This Week</h5>
                    <p class="display-6">{{myBookingsThisWeek.length}}</p>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card p-3 text-center">
                    <h5>Bookings Pending</h5>
                    <p class="display-6">{{pendingBookings.length}}</p>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card p-3 text-center">
                    <h5>Available Rooms</h5>
                    <p class="display-6">{{roomCount}}</p>
                </div>
            </div>
        </div>
    </div>

    <div class="card p-3">
        <h4 class="mb-3">Upcoming Bookings</h4>

        <!-- User's upcoming bookings to a table -->
         <table class="table">
            <!-- Column Headings -->
            <thead>
                <tr>
                    <th>Room</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>

            <!-- Table Body -->
             <tbody>
                <tr v-for="booking in bookings" :key="booking.roomId + booking.startTime">
                    <td>{{booking.roomId}}</td>
                    <td>{{booking.startTime}}</td>
                    <td><span class="badge" 
                        :class="booking.status === 'approved' ? 'bg-success' : 'bg-warning text-dark'">
                        {{booking.status}}</span>
                    </td>
                </tr>
             </tbody>
         </table>
    </div>
</template>