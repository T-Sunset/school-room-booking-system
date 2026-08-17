<script setup lang="ts">
    // OneRoomView.vue
    // Imports
    import { useRoute } from 'vue-router';
    import {ref, onMounted} from 'vue';
    import type { Room } from '../types/Room';
    import { getRoomSingle } from '../services/roomService';

    // Get the Room ID selected from the Rooms view
    const route = useRoute() // Use the router
    const roomId = route.params.id 
    const room = ref<Room | null>(null) // Room or null

    // Are we loading?
    const loading = ref(true) //Initialise as true 

    // Do we have an error?
    const error = ref("")

    // Get number of hours between the opening and closing hour of this room
    const hours : number[] = []

    // On page load / Start function
    onMounted(async () => {
        // Try to fetch the room according to RoomID if possible.
        try {
            const res = await getRoomSingle(roomId)
            room.value = res
        } catch (err:any) {
            // Report on any errors if they occur
            console.log(err.response?.data)
            error.value = err.response?.data || "Failed to load rooms."
        }
        finally {
            loading.value = false

            // Get number of hours between the opening and closing hour of this room
            if (room.value) {
                for (let h = room.value.rules.openHour; h < room.value.rules.closeHour; h++) {
                    hours.push(h)
                }
            }
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
</script>

<template>
    <!-- Header -->
    <h1 class="mb-4" v-if="loading">Room View</h1>

    <!-- Loading Message -->
     <div v-if="loading">
        Loading Rooms... Please Wait.
     </div>

    <!-- Error Message -->
     <div v-else-if="error" class="alert alert-danger">
        {{ error }}
     </div>
    
    <!-- Proper Header -->
     <h1 class="mb-4" v-if="!loading && room">{{ room.name }}</h1>

    <!-- Header Information Cards -->
     <div class="row mb-4">
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
     
     <div class="row">
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
                <p>{{ room?.rules.agreement }}</p>
            </div>
        </div>
     </div>

     <!-- Rule Break -->
      <hr/>

     <!-- Booking Table -->
     <table class="table table-bordered text-center">
        <thead>
            <tr>
                <th>Time</th>
                <th v-for="day in days" :key="day.value">{{ day.label }}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="hour in hours" :key="hour">
                <td>{{ hour }}:00</td>
                <td v-for="day in days" :key="day.value">Available</td>
            </tr>
        </tbody>
     </table>
</template>