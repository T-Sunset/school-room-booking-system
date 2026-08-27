<script setup lang="ts">
    // BookingModal.vue
    //Imports
    import {ref} from 'vue'
    import type { PossibleBooking } from '../types/Booking';
    import type { Room } from '../types/Room';
    import { submitBooking } from '../services/bookingService'

    // Define our emits--the outcomes of the modal
    const emit = defineEmits(["close", "accept", "error"])

    // Define our props--values that we are given by other pages
    const props = defineProps<{bookingData:PossibleBooking | null, roomData:Room, bandName?:string}>()

    // Get our room and booking objects
    const booking = ref<PossibleBooking>({
        ...props.bookingData
    } as PossibleBooking) 
    const room = ref<Room>({
        ...props.roomData
    } as Room)

    // Get whether or not the agreement is checked
    const agreed = ref<boolean>(false)

    // Get errors
    const error = ref<string>("")

    // Submit booking
    async function submit() {
        // Reset Error
        error.value = ""

        // Bail out if we don't agree
        if (!agreed.value) {
            error.value = "Cannot make a booking without signing the agreement."
            return
        }
        else {
            // Try to submit the booking
            try {
                // Run booking submission
                await submitBooking({room:room.value,app:booking.value})
                
                // Emit a success attempt
                emit("accept")
            } catch (err:any) {
                error.value = err.response?.data?.error || err.response?.data?.message || err.message
                emit("error", error.value)
                console.log(error.value)
            } finally {
                // If there was no errors...
                if (error.value === "") closeModal() // Close the Modal
            }
        }
    }
    function closeModal() {
        emit("close")
    }

    function formatDate(d:string) : string {
        if (!d) return ""
        
        // Convert string to date 
        let date = new Date(d)

        // Get to legible format 
        let result = date.toLocaleString()

        // Return
        return result
    }
</script>

<template>
    <div class="modal-backdrop-custom">
        <div class="modal-dialog-custom">
            <div class="card p-4">
                <!-- Header -->
                 <h4>Making a Booking</h4>
                 <div v-if="error" class="alert alert-danger">{{ error }}</div>
                    <!-- Booking Details -->
                    <!-- Get the Room's Name -->
                    <div class="row align-items-center mb-3">
                        <label for="roomname" class=" col-sm-4 col-form-label">Room Name: </label>
                        <div class="col-sm-8">
                            <label id="roomname">{{ room.name }}</label>
                        </div>
                    </div>

                    <!-- Get the Date & Time -->
                    <div class="row align-items-center mb-3">
                        <label for="dt" class=" col-sm-4 col-form-label">Date & Time: </label>
                        <div class="col-sm-8">
                            <label id="dt">{{ formatDate(booking.startTime) }} to {{ formatDate(booking.endTime) }}</label>
                        </div>
                    </div>

                    <!-- Get Band ID -->
                    <div class="row align-items-center mb-3" v-if="booking.bandId">
                        <label for="band" class=" col-sm-4 col-form-label">Band Name: </label>
                        <div class="col-sm-8">
                            <label id="band">{{ props.bandName || "Unknown band" }}</label>
                        </div>
                    </div>

                    <!-- Display Agreement-->
                    <div class="row align-items-center mb-3">
                        <label for="agreement" class=" col-sm-4 col-form-label">Room Agreement: </label>
                        <div class="col-sm-8">
                            <label id="agreement">{{ room.rules.agreement }}</label>
                        </div>
                    </div>

                    <!-- Agreement Check -->
                    <div class="row align-items-center mb-3">
                        <label for="agree" class="col-sm-4 form-check-label">I Agree: </label>
                        <div class="col-sm-8">
                            <div class="form-check">
                                <input id="agree" type="checkbox" v-model="agreed" class="form-check-input" required/>
                            </div>
                        </div>
                   </div>

                   <!-- End of Form, Button Section -->
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-secondary" @click="$emit('close')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" @click="submit">
                            Confirm
                        </button>
                    </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-backdrop-custom {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);

    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 1000;
}

.modal-dialog-custom {
    width: 500px;
    max-width: 90%;
}
</style>