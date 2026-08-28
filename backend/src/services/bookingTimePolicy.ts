export const BOOKING_BLOCK_MINUTES = 30

export type BookingTimeRules = {
    maxBookingHours: number
    openHour: number
    closeHour: number
    allowedDays?: number[]
}

export type BookingInterval = {
    start: Date
    end: Date
}

export function parseBookingInterval(startTime: string, endTime: string): BookingInterval {
    if (typeof startTime !== "string" || typeof endTime !== "string") {
        throw new Error("Booking times must be valid strings.")
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("Invalid date format.")
    }
    if (end <= start) {
        throw new Error("endTime must be after startTime.")
    }

    return { start, end }
}

export function getDurationMinutes(interval: BookingInterval): number {
    return (interval.end.getTime() - interval.start.getTime()) / (60 * 1000)
}

export function validateBookingInterval(
    startTime: string,
    endTime: string,
    rules: BookingTimeRules
): BookingInterval {
    const interval = parseBookingInterval(startTime, endTime)
    const durationMinutes = getDurationMinutes(interval)
    const startMinutes = interval.start.getHours() * 60 + interval.start.getMinutes()
    const endMinutes = interval.end.getHours() * 60 + interval.end.getMinutes()
    const maxBookingMinutes = rules.maxBookingHours * 60

    if (
        interval.start.getSeconds() !== 0 ||
        interval.start.getMilliseconds() !== 0 ||
        interval.end.getSeconds() !== 0 ||
        interval.end.getMilliseconds() !== 0 ||
        interval.start.getMinutes() % BOOKING_BLOCK_MINUTES !== 0 ||
        interval.end.getMinutes() % BOOKING_BLOCK_MINUTES !== 0
    ) {
        throw new Error("Booking times must align to 30-minute boundaries.")
    }
    if (durationMinutes <= 0 || durationMinutes % BOOKING_BLOCK_MINUTES !== 0) {
        throw new Error("Booking duration must be a positive multiple of 30 minutes.")
    }
    if (durationMinutes > maxBookingMinutes) {
        throw new Error("Booking exceeds maximum hours of selected room.")
    }
    if (interval.start.toDateString() !== interval.end.toDateString()) {
        throw new Error("Bookings must start and end on the same day.")
    }
    if (startMinutes < rules.openHour * 60 || endMinutes > rules.closeHour * 60) {
        throw new Error("Booking must be within valid opening hours.")
    }
    if (rules.allowedDays && !rules.allowedDays.includes(interval.start.getDay())) {
        throw new Error("Bookings not available in that room on that day.")
    }

    return interval
}
