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

export type AttendanceStatus = "unmarked" | "present" | "absent"
export type AttendanceUpdateStatus = Exclude<AttendanceStatus, "unmarked">

export type AttendanceUpdateRequest = {
    status: AttendanceUpdateStatus
}

export type AttendanceUpdateResponse = {
    studentId: string,
    status: AttendanceUpdateStatus,
    updatedBy: string,
    updatedAt: string
}

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

export interface RollcallEntry {
    bookingId: string,
    studentId: string,
    studentEmail: string,
    roomId: string,
    roomName: string,
    bandId?: string,
    bandName?: string,
    startTime: string,
    endTime: string,
    attendanceStatus: AttendanceStatus,
    attendanceUpdatedBy?: string,
    attendanceUpdatedAt?: string
}