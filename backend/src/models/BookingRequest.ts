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
    roomName?: string,
    createdBy:string,
    requesterEmail?: string,
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
// Re-usable Booking Function: Are two times overlapping?
export function isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date) : boolean {
    return startA < endB && endA > startB
}

// Possible Booking
export type PossibleBooking = {
    type:BookingType,
    startTime:string,
    endTime:string,
    bandId?:string
}

export function initialBooking(input:PossibleBooking) : BookingRequest {
    // Get result
    return {
        id:"",
        roomId:"",
        createdBy:"",
        type:"solo",
        startTime:"",
        endTime:"",
        status:"pending",
        reason:"",
        approvedBy:"",
        approvedAt:"",
        schoolId:"",
        createdAt:new Date().toISOString()
    }
}