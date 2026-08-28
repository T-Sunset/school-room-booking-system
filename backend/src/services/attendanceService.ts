import { db } from "../config/firebase"
import type { Attendance, AttendanceStatus } from "../models/Attendance"
import type { BookingRequest } from "../models/BookingRequest"
import type { User } from "../models/User"
import { canRecordAttendance } from "../rbac/can"
import { getLocalCalendarDayRange } from "./bookingDateRange"

export type AttendanceUpdateResponse = {
    studentId: string,
    status: AttendanceStatus,
    updatedBy: string,
    updatedAt: string
}

export async function recordAttendance(
    bookingId: string,
    studentId: string,
    status: unknown,
    user: User
): Promise<AttendanceUpdateResponse> {
    if (!user.role || !canRecordAttendance(user.role)) {
        throw new Error("Unauthorised to record attendance.")
    }
    if (typeof user.schoolId !== "string" || !user.schoolId.trim()) {
        throw new Error("User is not assigned to a valid school.")
    }
    if (!bookingId || !studentId) {
        throw new Error("Booking ID and student ID are required.")
    }
    if (status !== "present" && status !== "absent") {
        throw new Error("Attendance status must be 'present' or 'absent'.")
    }

    const bookingReference = db.collection("bookings").doc(bookingId)
    const bookingSnapshot = await bookingReference.get()
    if (!bookingSnapshot.exists) {
        throw new Error("Booking not found.")
    }

    const booking = { id: bookingSnapshot.id, ...bookingSnapshot.data() } as BookingRequest
    if (booking.schoolId !== user.schoolId) {
        throw new Error("Unauthorised for this school's booking.")
    }
    if (booking.status !== "approved") {
        throw new Error("Attendance can only be recorded for approved bookings.")
    }

    const bookingStart = new Date(booking.startTime)
    if (Number.isNaN(bookingStart.getTime())) {
        throw new Error("Booking has an invalid start time.")
    }
    const now = new Date()
    if (now < bookingStart) {
        throw new Error("Attendance cannot be recorded before the booking starts.")
    }

    const bookingDay = getLocalCalendarDayRange(
        `${bookingStart.getFullYear()}-${String(bookingStart.getMonth() + 1).padStart(2, "0")}-${String(bookingStart.getDate()).padStart(2, "0")}`
    )
    if (now < bookingDay.start || now >= bookingDay.end) {
        throw new Error("Attendance can only be recorded on the booking's calendar day.")
    }

    if (booking.type === "solo") {
        if (studentId !== booking.createdBy) {
            throw new Error("Student is not associated with this booking.")
        }
    } else if (booking.type === "band" && booking.bandId) {
        const bandSnapshot = await db.collection("bands").doc(booking.bandId).get()
        const band = bandSnapshot.data()
        if (!bandSnapshot.exists || band?.status !== "approved" || band.schoolId !== user.schoolId) {
            throw new Error("Booking does not have a valid approved band.")
        }
        if (!Array.isArray(band.memberIds) || !band.memberIds.includes(studentId)) {
            throw new Error("Student is not a member of this booking's band.")
        }
    } else {
        throw new Error("Booking has an invalid type or band.")
    }

    const studentSnapshot = await db.collection("users").doc(studentId).get()
    const student = studentSnapshot.data()
    if (!studentSnapshot.exists || student?.role !== "student" || student.schoolId !== user.schoolId) {
        throw new Error("Student is not associated with this booking.")
    }

    const attendanceReference = bookingReference.collection("attendance").doc(studentId)
    const existingSnapshot = await attendanceReference.get()
    const updatedAt = now.toISOString()
    if (existingSnapshot.exists) {
        await attendanceReference.set({
            status,
            updatedBy: user.id,
            updatedAt
        }, { merge: true })
    } else {
        const attendance: Omit<Attendance, "id"> = {
            studentId,
            status,
            schoolId: user.schoolId,
            recordedBy: user.id,
            recordedAt: updatedAt,
            updatedBy: user.id,
            updatedAt
        }
        await attendanceReference.set(attendance)
    }

    return {
        studentId,
        status,
        updatedBy: user.id,
        updatedAt
    }
}