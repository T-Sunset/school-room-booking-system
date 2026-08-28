// roomService.ts
import api from './api'
import type { Room, RoomAvailabilityCell } from '../types/Room'
import type { PossibleBooking } from '../types/Booking'

// Get Rooms 
export async function getRooms() {
    const response = await api.get("/rooms")
    return response.data
}

// Get a single room
export async function getRoomSingle(input:string | string[]) {
    const response = await api.get(`/rooms/${input}`)
    return response.data
}

// Get all rooms that are available for a booking in given criteria
export async function getRoomsForBooking(input:PossibleBooking) {
    const response = await api.post(`/rooms/req`, input)
    return response.data
}

// Add a New Room
export async function createRoom(input:Room) {
    // Get response
    const response = await api.post("/rooms", input)
    console.log("Response: ", response.data)

    // Did it work?
    return response.data.newroom
}

// Edit and Update a Room
export async function updateRoom(input:Room) {
    // Get response
    const response = await api.patch(`/rooms/${input.id}`, input)
    console.log("Response: ", response.data)

    // Did it work?
    return response.data.success
}

// Deactivate a room without removing its historical record.
export async function deactivateRoom(roomId:string): Promise<"deactivated" | "already_inactive"> {
    const response = await api.delete(`/rooms/${roomId}`)
    return response.data.status
}

// Get the current week's hourly availability for a room.
export async function getRoomAvailability(input:string | string[]): Promise<RoomAvailabilityCell[]> {
    const response = await api.get(`/rooms/${input}/availability`)
    return response.data
}