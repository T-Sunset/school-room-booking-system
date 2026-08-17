// BookingRequest.ts

// Booking Status 
export type BookingStatus = 
    | "approved"
    | "pending"
    | "waitlisted"
    | "denied"
    | "cancelled"

// Booking types
export type BookingType = "solo" | "band"

// Define booking(s)
export type BookingRequest = {
    id: string,
    roomId: string,
    createdBy:string,
    type: BookingType,
    bandId?:string,
    bandName?:string,

    startTime: string,
    endTime: string,

    status: BookingStatus,
    reason: string,
    approvedBy: string,
    approvedAt: string,

    schoolId:string,
    createdAt:string
}

// Possible Booking
export type PossibleBooking = {
    type:BookingType,
    startTime:string,
    endTime:string,
    bandId?:string
}

// Helper Function(s)
export function getStartOfWeek() {
    const now = new Date()
    const day = now.getDay()

    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0,0,0,0)

    return start
}