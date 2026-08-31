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
    weeklyEntitlementConsumed: boolean,
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
        weeklyEntitlementConsumed:false,
        reason:"",
        approvedBy:"",
        approvedAt:"",
        schoolId:"",
        createdAt:new Date().toISOString()
    }
}

type WeeklyEntitlementBooking = Pick<BookingRequest, "type" | "status" | "startTime" | "weeklyEntitlementConsumed">

export function hasConsumedWeeklySoloEntitlement(booking: WeeklyEntitlementBooking): boolean {
    return booking.type === "solo" &&
        (booking.status === "approved" || booking.status === "cancelled") &&
        booking.weeklyEntitlementConsumed === true
}

export function countWeeklySoloEntitlements(bookings: WeeklyEntitlementBooking[], weekStart: Date): number {
    const nextWeek = new Date(weekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return bookings.filter((booking) => {
        if (!hasConsumedWeeklySoloEntitlement(booking)) return false

        const bookingStart = new Date(booking.startTime)
        return !Number.isNaN(bookingStart.getTime()) &&
            bookingStart >= weekStart &&
            bookingStart < nextWeek
    }).length
}

type StudentCancellableBooking = Pick<BookingRequest, "createdBy" | "status" | "startTime">

export function canStudentCancelBooking(booking: StudentCancellableBooking, studentId: string, now: Date): boolean {
    if (booking.createdBy !== studentId) return false
    if (booking.status !== "pending" && booking.status !== "waitlisted" && booking.status !== "approved") return false

    const startTime = new Date(booking.startTime)
    return !Number.isNaN(startTime.getTime()) && now < startTime
}