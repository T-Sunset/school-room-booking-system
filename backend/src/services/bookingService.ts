// BookingService.ts
import { db } from "../config/firebase"
import { BookingRequest, isOverlapping, BookingStatus, PossibleBooking, initialBooking } from "../models/BookingRequest"
import type { Room } from "../models/Room"
import { RULES } from "../models/Rules"
import { canApproveBooking, canCreateBooking } from "../rbac/can"
import type { User } from "../models/User"

// Create a booking 
export async function createBooking(input: {room:Room, app:PossibleBooking}, user:User) {
    // Abort if the user cannot create bookings 
    if (!canCreateBooking(user.role)) {throw new Error("Not allowed to create bookings.")}

    // Get request information (booking fields) to variables
    const roomId = input.room.id
    const type = input.app.type
    const bandId = input.app.bandId
    const startTime = input.app.startTime
    const endTime = input.app.endTime
    const schoolId = user.schoolId
    const userId = user.id

    // Get booking data to an object 
    const booking : BookingRequest = {
        ...initialBooking(input.app),
        roomId,
        type,
        bandId,
        startTime,
        endTime,
        schoolId,
        createdBy:userId,
        createdAt:new Date().toISOString()
    }

    // Get Room
    const roomSnap = await db.collection("rooms").doc(roomId).get()
    //...and Validate 
    if (!roomSnap.exists) { throw new Error("Room not found.") }
    const room = roomSnap.data()
    if (room.schoolId !== user.schoolId) { throw new Error("Not authorised for this room.") }

    // Is the booker a student? If so, go through validation.
    if (user.role === "student") {
        // Is the room bookable?
        if (!room.isBookable) {
            throw new Error("Room is not bookable.")
        }

        // Step 1: Ensure all fields exist 
        if (!roomId || !userId || !startTime || !endTime || !type) {
            // Bad request, respond 400
            throw new Error("Missing required fields.")
        }

        // Step 2: Ensure all fields are strings 
        if (
            typeof roomId !== "string" ||
            typeof userId !== "string" ||
            typeof startTime !== "string" ||
            typeof endTime !== "string"
        ) {
            // Bad request, respond 400
            throw new Error("All fields must be of valid data type.")
        }

        // Step 3: Convert date strings to date objects 
        const start = new Date(startTime)
        const end = new Date(endTime)

        // Step 4: Validate date objects
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Invalid date format.")
        }

        // Step 5: Ensure end is AFTER start 
        if (end <= start) {
            throw new Error("endTime must be after startTime..")
        }

        // Step 6: Ensure the duration of the booking is within max length boundaries 
        const durationMs = end.getTime() - start.getTime()
        const durationHours = durationMs / (1000*60*60)
        const maxHours = room.rules.maxBookingHours ?? RULES.maxBookingHours // Set max hours a booking can be to room max if it exists, otherwise rules max
        if (durationHours > maxHours) {
            throw new Error("Booking exceeds maximum hours of selected room.")
        }

        // Step 7: Must be within school hours
        const startHour = start.getHours()
        const endHour = end.getHours()
        const open = room.rules?.openHour ?? RULES.openHour
        const close = room.rules?.closeHour ?? RULES.closeHour
        if (startHour < open || endHour > close) {
            throw new Error("Booking must be within valid opening hours.")
        }

        // Step 8: Must be in the future. 
        const now = new Date()
        if (start <= now) {
            throw new Error("Booking must be in the future.")
        }

        // Step 9: Must be on a valid day 
        const dayOfWeek = start.getDay()
        const allowedDays = room.rules?.allowedDays ?? RULES.allowedDays
        if (!allowedDays.includes(dayOfWeek)) {
            throw new Error("Bookings not available in that room on that day.")
        }

        // Step 10: Check for existing bookings / conflicts 
        // Get database bookings of the same room 
        const snapshot = await db.collection("bookings")
        .where("schoolId","==",user.schoolId)
        .where("roomId", "==", roomId)
        .where("status","==","approved")
        .get()

        const existingBookings = snapshot.docs.map(doc => doc.data()) // Get existing bookings of the same room to a collection
        
        // Look through the collection and try to find one that conflicts, if possible
        const conflictingBooking = existingBookings.find((booking:any) => {
            // As we go through all existing bookings of this room, get their start and end times
            const ourStart = new Date(booking.startTime)
            const ourEnd = new Date(booking.endTime)

            // Do the start/end times overlap with our new booking's times?
            return isOverlapping(start, end, ourStart, ourEnd)
        })

        // If there's a conflict...
        if (conflictingBooking) {
            throw new Error("This room is already booked for that timeslot.")
        }
    }

    // Is this a band booking?
    if (type === "band") {
        // Validate that there's a bandId with this request 
        if (!bandId) { throw new Error("No BandID provided. Required for band bookings.") }
        await validateBandBooking(bandId, user)
    }

    // Final: Passed validation.
    const status = await determineBookingStatus(booking, user, room) // Get the booking status of this booking request (approved, waitlisted, pending)
    const reason = booking.reason
    const approvedBy = booking.approvedBy
    const approvedAt = booking.approvedAt
    // Set Time 
    const createdAt = new Date().toISOString()

    // Save Booking 
    const docRef = await db.collection("bookings").add({
        roomId,
        createdBy:userId,
        startTime,
        endTime,
        type,
        bandId:bandId || null,
        status,
        reason,
        approvedBy,
        approvedAt,
        schoolId,
        createdAt
    })
    // Return OK!
    return {
        id: docRef.id,
        roomId,
        createdBy:userId,
        type,
        bandId,
        startTime,
        endTime,
        status,
        reason,
        approvedBy,
        approvedAt,
        schoolId,
        createdAt
    }
}

// Determine the status of a booking 
async function determineBookingStatus(input:BookingRequest, user:User, room): Promise<BookingStatus> {
    // Step 0: Auto-pass admin / teacher bookings 
    if (user.role !== "student") {
        setDecision(input, "Bookings made by staff are auto-approved.")
        return "approved" 
    }
    
    // Step 1: If the booking is a Band type booking, automatically send it to the pending list 
    if (input.type === "band") 
    {
        setDecision(input, "Band bookings must be approved manually.")
        return "pending"
    }

    // Step 2: Check if the room always requires approval 
    if (room.rules.requiresApproval) {
        setDecision(input, "Bookings of this room must be approved manually.")
        return "pending"
    }

    // Step 3: It must be a solo booking. Get the timestamp of the start of this week.
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0,0,0,0)

    // Step 4: Has the solo booker made any other bookings since the start of this week?
    const snapshot = await db 
        .collection("bookings")
        .where("createdBy", "==", user.id)
        .where("schoolId","==",user.schoolId)
        .where("type","==","solo")
        .where("status","==","approved")
        .where("startTime",">=",startOfWeek.toISOString())
        .get()
    if (snapshot.size === 0) { 
        // No other bookings made this week. 
        setDecision(input, "First solo booking of the week is automatically approved.")
        return "approved" 
    } else if (snapshot.size === 1) { 
        setDecision(input, "Solo bookings after the first are placed automatically to the Waitlist.")
        return "waitlisted" 
    }
    else {
        throw new Error("A hard maximum of two bookings can be made per week.")
    }
}

// Validate a band used for a booking 
async function validateBandBooking(bandId:string, user:User) {
    // Get a snapshot of the band 
    const snap = await db.collection("bands").doc(bandId).get()

    // Validate: Does it exist?
    if (!snap.exists) { throw new Error("Band not found.") }
    
    // Get Band Data 
    const band = snap.data()

    // Validate further 
    if (band?.status !== "approved") { throw new Error("Band status is not approved.") }
    if (band?.schoolId !== user.schoolId) { throw new Error("Band belongs to another school.") }
    if (!band?.memberIds.includes(user.id)) { throw new Error("You are not a member of this band.") }

    // Return
    return band
}

// Approve a Booking 
export async function approveBooking(bookingId: string, user:User) {
    // Can this user's role create a booking?
    if (!canApproveBooking(user.role)) { throw new Error("Unauthorised to approve bookings.") }

    // Fetch the booking 
    const ref = db.collection("bookings").doc(bookingId) // Get the document reference
    const snap = await ref.get() // Get a snapshot of the document

    // Does the booking exist?
    if (!snap.exists) { throw new Error("Booking not found.") }

    // Get the snapshot to data 
    const booking = snap.data()

    // School validation 
    if (booking.schoolId !== user.schoolId) { throw new Error("Not authorised for this school.") }

    // Is the booking pending or on the waitlist? 
    if (booking?.status !== "pending" && booking?.status !== "waitlisted") {
        throw new Error("Only pending / waitlisted bookings can be approved.")
    }

    // Will approving this booking cause an overlap?
    const snapshot = await db.collection("bookings")
    .where("schoolId","==",user.schoolId)
    .where("roomId", "==", booking.roomId)
    .where("status","==","approved")
    .get()

    const existingBookings = snapshot.docs.map(doc => doc.data()) // Get existing bookings of the same room to a collection

    // Look through the collection and try to find one that conflicts, if possible
    const conflictingBooking = existingBookings.find((b:any) => {
        // As we go through all existing bookings of this room, get their start and end times
        const ourStart = new Date(b.startTime)
        const ourEnd = new Date(b.endTime)
        const newStart = new Date(booking.startTime)
        const newEnd = new Date(booking.endTime)
        
        // Do the start/end times overlap with our new booking's times?
        return isOverlapping(newStart, newEnd, ourStart, ourEnd)
    })

    // If there's a conflict...
    if (conflictingBooking) {
        throw new Error("This room is already booked for that timeslot.")
    }

    // Update the booking to approved 
    await ref.update({
        status:"approved",
        approvedBy:user.id,
        approvedAt:new Date().toISOString()
    })
}
// Deny a Booking 
export async function denyBooking(bookingId:string, user:User) {
    if (!canApproveBooking(user.role)) { throw new Error("Unauthorised to deny bookings.") }

    // Fetch the booking 
    const ref = db.collection("bookings").doc(bookingId)
    const snap = await ref.get()

    if (!snap.exists) {
        throw new Error("Booking not found.")
    }

    // Get the snapshot to data 
    const booking = snap.data()

    // Validate per school
    if (booking.schoolId !== user.schoolId) { throw new Error("Not authorised for this school.") }

    // Ensure that the booking we're looking at is either pending or waitlisted
    if (booking?.status !== "pending" && booking?.status !== "waitlisted") { throw new Error("Only pending / waitlisted bookings can be approved.")}

    // Update the booking 
    await ref.update({
        status:"denied",
        approvedBy:user.id,
        approvedAt:new Date().toISOString()
    })
}

// Get pending bookings 
export async function getPendingBookings(user:User) {
    // Ensure this user has the authorization to deal with this 
    if (!canApproveBooking(user.role)) { throw new Error("Unauthorised to view pending bookings.") }

    // Get valid bookings 
    const snapshot = await db 
    .collection("bookings")
    .where("schoolId","==",user.schoolId)
    .where("status","in",["pending", "waitlisted"])
    .orderBy("startTime")
    .get()

    // Convert data to JSON 
    return snapshot.docs.map(doc => ({
        id:doc.id,
        ...doc.data()
    }))
}

// Helper Function: Set a Decision 
function setDecision(input, reason:string) {
   input.reason = reason
   input.approvedBy = "Automatic"
   input.approvedAt = new Date().toISOString()
}
