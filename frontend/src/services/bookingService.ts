// bookingService.ts 
import api from './api'
import type { Room } from '../types/Room'
import type { PossibleBooking } from '../types/Booking'
import type { BookingRequest, RollcallEntry } from '../types/Booking'

export type BookingActionResponse = {
    success: boolean
    status: BookingRequest['status']
}

// Get bookings
export async function getBookings(): Promise<BookingRequest[]> {
    const response = await api.get("/bookings/mine")
    return response.data
}

// Get pending and waitlisted bookings for staff review.
export async function getPendingBookings(): Promise<BookingRequest[]> {
    const response = await api.get("/bookings/pending")
    return response.data
}

// Get all school bookings intersecting a calendar date for staff.
export async function getSchoolBookingsForDate(date: string): Promise<BookingRequest[]> {
    const response = await api.get("/bookings/school", { params: { date } })
    return response.data
}

// Submit a Booking
export async function submitBooking(input:{room:Room, app:PossibleBooking}) {
    const response = await api.post("/bookings", input)
    return response.data
}

// Approve a pending or waitlisted booking.
export async function approveBooking(bookingId: string): Promise<BookingActionResponse> {
    const response = await api.patch(`/bookings/${bookingId}/approve`)
    return response.data
}

// Deny a pending or waitlisted booking.
export async function denyBooking(bookingId: string): Promise<BookingActionResponse> {
    const response = await api.patch(`/bookings/${bookingId}/deny`)
    return response.data
}

// Get the current authoritative Rollcall for staff.
export async function getRollcall(): Promise<RollcallEntry[]> {
    const response = await api.get("/rollcall")
    return response.data
}