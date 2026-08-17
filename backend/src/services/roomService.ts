// roomService.ts
import { db } from "../config/firebase"
import { Room } from "../models/Room"
import { canCreateBooking, canOverrideRules } from "../rbac/can"
import { RULES } from "../models/Rules"
import type { User } from "../models/User"
import { BookingRequest, isOverlapping, PossibleBooking } from "../models/BookingRequest"

// Create a Room
export async function createRoom(input:Room, user:User) {
    // Ensure role 
    if (!canOverrideRules(user.role)) { throw new Error("Not authorised to create or edit rooms.") }

    // Get required information to constants 
    const { name, isBookable } = input 
    const schoolId = user.schoolId
    const createdBy = user.id
    const createdAt = new Date().toISOString()

    // Validate input 
    if (!name || typeof isBookable !== "boolean") { throw new Error("Missing required fields.") }
    if (typeof name !== "string" || typeof isBookable !== "boolean") { throw new Error("All fields must be of valid data types.") }
    const rules = {
        ...RULES,
        ...input.rules
    }

    // Get normalised name 
    const nameNormalised = input.name
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
    
        // Check if any other rooms exist with the same name 
    const sameNameRooms = await db.collection("rooms")
        .where("schoolId", "==", user.schoolId)
        .where("nameNormalised","==",nameNormalised)
        .get()
    if (sameNameRooms.size > 0) { throw new Error("A room with that name already exists.") }

    // Save Room 
    const docRef = await db.collection("rooms").add({
        schoolId,
        name,
        nameNormalised,
        isBookable,
        rules,
        createdBy,
        createdAt
    })

    // Return OK!
    return {
        id: docRef.id,
        schoolId,
        name,
        isBookable,
        rules,
        createdBy,
        createdAt
    }
}

// Edit a Room
export async function editRoom(roomId:string, input: Room, user:User) {
    // Check role accessibility 
    if (!canOverrideRules(user.role)) { throw new Error("Unauthorised to edit room information.") }

    // Separate rules from non-rules 
    const {name, isBookable} = input

    // Fetch the room 
    const ref = db.collection("rooms").doc(roomId)
    const snap = await ref.get()

    // Does the room exist?
    if (!snap.exists) {
        throw new Error("Room not found.")
    }

    // Get room snapshot to room data 
    const room = snap.data()

    // Ensure that it's from the same school as the user 
    // Check SchoolID and validate 
    if (room.schoolId !== user.schoolId) { throw new Error("Not authorised for this school.") }
    
    // Ensure there's no rooms with the same name 
    let nameNormalised = room.nameNormalised
    if (name) {
        nameNormalised = name
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase()
        const sameNameRooms = await db.collection("rooms")
            .where("schoolId", "==", user.schoolId)
            .where("nameNormalised","==",nameNormalised)
            .get()
        if (sameNameRooms.docs.some(doc=>doc.id !== roomId)) { throw new Error("A room with that name already exists.") }
    }

    // Apply changes 
    const rules = {
        ...room.rules,
        ...(input.rules ?? {})
    }

    // Update 
    await ref.update({
        name:input.name ?? room.name,
        isBookable:input.isBookable ?? room.isBookable,
        nameNormalised,
        rules
    })
}

// Remove a Room
export async function removeRoom(roomId:string, user:User) {
    // Check role accessibility 
    if (!canOverrideRules(user.role)) { throw new Error("Unauthorised to edit room data.") }

    // Fetch the room 
    const ref = db.collection("rooms").doc(roomId)
    const snap = await ref.get()

    // Does the room exist?
    if (!snap.exists) {
        throw new Error("Room not found.")
    }

    // Get snapshot to data 
    const room = snap.data()
    
    // Check SchoolID and validate 
    if (room.schoolId !== user.schoolId) { throw new Error("Not authorised for this school.") }

    // Otherwise, remove the room.
    await ref.delete()
} 

// Get Rooms 
export async function getRooms(user:User) {
    // Ensure valid rights 
    if (!canCreateBooking(user.role)) { throw new Error("Unauthorised to view rooms.") }

    // Get a snapshot of the Database for all valid rooms 
    const snapshot = await db
    .collection("rooms")
    .where("schoolId","==",user.schoolId)
    .get()

    // Return 
    return snapshot.docs.map(doc => ({
        id:doc.id,
        ...doc.data()
    }))
}

// Get a Single Room
export async function getRoomSingle(roomId:string, user:User) {
    // Ensure valid rights 
    if (!canCreateBooking(user.role)) { throw new Error("Unauthorised to view rooms.") }

    // Fetch the room 
    const ref = db.collection("rooms").doc(roomId)
    const snap = await ref.get()

    // Does the room exist?
    if (!snap.exists) {
        throw new Error("Room not found.")
    }

    // Get room snapshot to room data 
    const room = snap.data()

    // Ensure that it's from the same school as the user 
    // Check SchoolID and validate 
    if (room.schoolId !== user.schoolId) { throw new Error("Not authorised for this school.") }

    // Return as Room
    return room
}

// Get All Rooms Matching Requirements
export async function getRoomWithRequirements(input:PossibleBooking, user:User) {
    // Ensure valid rights 
    if (!canCreateBooking(user.role)) {throw new Error("Unauthorised to view rooms.")}

    // Convert times to valid data types
    const start = new Date(input.startTime)
    const end = new Date(input.endTime)
    const startHour = start.getHours()
    const endHour = end.getHours()
    const weekday = start.getDay()

    // Get a snapshot of the Database all rooms that are open during that time & bookable
    const snapshot = await db
        .collection("rooms")
        .where("schoolId","==",user.schoolId)
        .where("isBookable","==",true)
        .get()

    // Get our snapshot to an array of Room objects
    const rooms = snapshot.docs
        .map(doc => ({
            id:doc.id,
            ...doc.data()
        })) as Room[]

    // Filter that array to only Rooms that are bookable by the user (based on weekday & year level)
    const eligibleRooms = rooms.filter(room => room.rules.allowedDays.includes(weekday) && 
        room.rules.allowedYearLevels.includes(Number(user.yearLevel)) &&
        room.rules.openHour <= startHour &&
        room.rules.closeHour >= endHour)

    // Get the IDs of all eligible rooms
    const eligibleIds = new Set(eligibleRooms.map(room => room.id))

    // Snapshot all bookings that will be taking place around the same time as the requested time at the same school
    const bookingSnapshot = await db 
        .collection("bookings")
        .where("schoolId","==",user.schoolId)
        .get()

    // Get all rooms that are unavailable by circumstance (booked out for that timeslot)
    const unavailableRooms = new Set<string>()
    bookingSnapshot.docs.forEach(doc => { // Iterate through bookings
        // Get booking Firestore document to BookingRequest object 
        const booking = doc.data() as BookingRequest

        // Is this booking for an irrelevant room? Move on, don't need
        if (!eligibleIds.has(booking.roomId)) return

        // Does this booking NOT interfere with our current requested timeslot? Move on
        if (booking.status === "cancelled" || booking.status === "denied") return // Cancelled or denied bookings do NOT invalidate our req

        // Check for overlaps, which DO invalidate our request
        if (isOverlapping(start, end, new Date(booking.startTime), new Date(booking.endTime))) {
            unavailableRooms.add(booking.roomId) // Mark this room as unavailable
        }
    })

    // Return rooms that are bookable by the user (weekday & year level) that are NOT unavailable by circumstance
    return eligibleRooms.filter(room => !unavailableRooms.has(room.id))
}