export type LocalDateRange = {
    start: Date
    end: Date
}

export function getLocalCalendarDayRange(date: string): LocalDateRange {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("Date must use YYYY-MM-DD format.")
    }

    const [year, month, day] = date.split("-").map(Number)
    const start = new Date(year, month - 1, day)
    if (
        start.getFullYear() !== year ||
        start.getMonth() !== month - 1 ||
        start.getDate() !== day
    ) {
        throw new Error("Date must be a valid calendar date.")
    }

    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end }
}

export function bookingIntersectsCalendarDay(
    bookingStart: Date,
    bookingEnd: Date,
    calendarDay: LocalDateRange
): boolean {
    return bookingStart < calendarDay.end && bookingEnd > calendarDay.start
}
