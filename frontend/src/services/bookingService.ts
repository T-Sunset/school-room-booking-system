// bookingService.ts 
import api from './api'
import type { Room } from '../types/Room'
import type { PossibleBooking } from '../types/Booking'

// Get bookings
export async function getBookings() {
    const response = await api.get("/bookings")
    return response.data
}

// Submit a Booking
export async function submitBooking(input:{room:Room, app:PossibleBooking}) {
    const response = await api.post("/bookings", input)
    return response.data
}