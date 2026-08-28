// roomService.ts
import { db } from "../config/firebase"
import { Room } from "../models/Room"
import { canCreateBooking, canOverrideRules } from "../rbac/can"
import { RULES } from "../models/Rules"
import type { User } from "../models/User"
import { BookingRequest, isOverlapping, PossibleBooking } from "../models/BookingRequest"
import { BOOKING_BLOCK_MINUTES, parseBookingInterval, validateBookingInterval } from "./bookingTimePolicy"
import { logAuditEvent } from "./auditService"

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

    try {
        await logAuditEvent({
            actor: user,
            action: "room.created",
            entityType: "room",
            entityId: docRef.id,
            metadata: { roomName: name }
        })
    } catch (error) {
        console.error("Failed to write room creation audit event:", error)
    }

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

    const nextName = input.name ?? room.name
    const nextIsBookable = input.isBookable ?? room.isBookable

    // Apply changes 
    const rules = {
        ...room.rules,
        ...(input.rules ?? {})
    }

    const isReactivating = room.isBookable === false && nextIsBookable === true
    const changedFields: Record<string, string | number | boolean | null> = {}
    if (nextName !== room.name) {
        changedFields.previousName = room.name
        changedFields.newName = nextName
    }
    if (nextIsBookable !== room.isBookable) {
        changedFields.previousIsBookable = room.isBookable
        changedFields.newIsBookable = nextIsBookable
    }
    if (JSON.stringify(rules) !== JSON.stringify(room.rules)) {
        changedFields.rulesChanged = true
    }

    const isDeactivating = room.isBookable !== false && nextIsBookable === false
    if (isReactivating || isDeactivating) {
        const transitionAt = new Date().toISOString()
        const transitionAction = isReactivating ? "room.reactivated" : "room.deactivated"
        await db.runTransaction(async (transaction) => {
            const latestSnapshot = await transaction.get(ref)
            if (!latestSnapshot.exists) throw new Error("Room not found.")
            const latestRoom = latestSnapshot.data()
            if (latestRoom.schoolId !== user.schoolId) throw new Error("Not authorised for this school.")

            transaction.update(ref, {
                name: nextName,
                isBookable: nextIsBookable,
                nameNormalised,
                rules,
                deactivatedAt: isReactivating ? null : transitionAt,
                deactivatedBy: isReactivating ? null : user.id
            })
            await logAuditEvent({
                actor: user,
                action: transitionAction,
                entityType: "room",
                entityId: roomId,
                metadata: {
                    roomName: nextName,
                    ...(isDeactivating ? { deactivatedBy: user.id } : {})
                }
            }, transaction)
        })
        return
    }

    // Update 
    await ref.update({
        name:nextName,
        isBookable:nextIsBookable,
        nameNormalised,
        rules
    })

    if (Object.keys(changedFields).length > 0) {
        try {
            await logAuditEvent({
                actor: user,
                action: "room.updated",
                entityType: "room",
                entityId: roomId,
                metadata: { roomName: nextName, ...changedFields }
            })
        } catch (error) {
            console.error("Failed to write room update audit event:", error)
        }
    }
}

// Remove a Room
export async function removeRoom(roomId:string, user:User) {
    // Check role accessibility 
    if (!canOverrideRules(user.role)) { throw new Error("Unauthorised to edit room data.") }

    // Fetch the room 
    const ref = db.collection("rooms").doc(roomId)
    return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref)

        if (!snap.exists) {
            throw new Error("Room not found.")
        }

        const room = snap.data()
        if (room.schoolId !== user.schoolId) { throw new Error("Not authorised for this school.") }
        if (room.isBookable === false) return { status: "already_inactive" as const }

        const deactivatedAt = new Date().toISOString()
        transaction.update(ref, {
            isBookable: false,
            deactivatedAt,
            deactivatedBy: user.id
        })
        await logAuditEvent({
            actor: user,
            action: "room.deactivated",
            entityType: "room",
            entityId: roomId,
            metadata: { roomName: room.name }
        }, transaction)
        return { status: "deactivated" as const }
    })
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

    const bookingSnapshot = await db
        .collection("bookings")
        .where("schoolId", "==", user.schoolId)
        .where("status", "==", "approved")
        .get()

    const approvedBookings = bookingSnapshot.docs.map(doc => doc.data() as BookingRequest)
    const now = new Date()

    // Return 
    return snapshot.docs.map(doc => {
        const room = {
            id:doc.id,
            ...doc.data()
        } as Room
        const roomBookings = approvedBookings.filter(booking => booking.roomId === room.id)
        const currentBooking = roomBookings.find(booking => {
            const start = new Date(booking.startTime)
            const end = new Date(booking.endTime)
            return start <= now && end > now
        })

        return {
            ...room,
            isInUse: !!currentBooking,
            nextAvailable: getNextAvailable(room, roomBookings, now)
        }
    })
}

export function getNextAvailable(room: Room, bookings: BookingRequest[], now: Date, durationMinutes = 60): string | null {
    if (!room.isBookable) return null

    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const candidateDay = new Date(now)
        candidateDay.setDate(now.getDate() + dayOffset)
        candidateDay.setHours(room.rules.openHour, 0, 0, 0)

        if (!room.rules.allowedDays.includes(candidateDay.getDay())) continue
        if (dayOffset === 0 && candidateDay < now) {
            const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
            const nextBoundary = Math.ceil(minutesSinceMidnight / BOOKING_BLOCK_MINUTES) * BOOKING_BLOCK_MINUTES
            candidateDay.setHours(Math.floor(nextBoundary / 60), nextBoundary % 60, 0, 0)
        }

        const candidateEnd = new Date(candidateDay)
        candidateEnd.setMinutes(candidateEnd.getMinutes() + durationMinutes)
        try {
            validateBookingInterval(candidateDay.toISOString(), candidateEnd.toISOString(), room.rules)
        } catch {
            continue
        }

        const overlaps = bookings.some(booking => isOverlapping(
            candidateDay,
            candidateEnd,
            new Date(booking.startTime),
            new Date(booking.endTime)
        ))
        if (!overlaps) return candidateDay.toISOString()
    }

    return null
}

export type RoomAvailabilityCell = {
    date: string,
    day: number,
    hour: number,
    startTime: string,
    endTime: string,
    status: "available" | "booked" | "unavailable"
}

export function buildRoomAvailabilityCells(room: Room, approvedBookings: BookingRequest[], today = new Date()): RoomAvailabilityCell[] {
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const cells: RoomAvailabilityCell[] = []

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + dayOffset)
        const isAllowedDay = room.rules.allowedDays.includes(date.getDay())

        for (let hour = room.rules.openHour; hour < room.rules.closeHour; hour += 0.5) {
            const startTime = new Date(date)
            startTime.setHours(Math.floor(hour), hour % 1 === 0.5 ? 30 : 0, 0, 0)
            const endTime = new Date(startTime)
            endTime.setMinutes(endTime.getMinutes() + BOOKING_BLOCK_MINUTES)
            const booked = approvedBookings.some((booking) => isOverlapping(
                startTime,
                endTime,
                new Date(booking.startTime),
                new Date(booking.endTime)
            ))

            cells.push({
                date: startTime.toISOString().slice(0, 10),
                day: date.getDay(),
                hour,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                status: !room.isBookable || !isAllowedDay
                    ? "unavailable"
                    : booked
                        ? "booked"
                        : "available"
            })
        }
    }

    return cells
}

export async function getRoomAvailability(roomId: string, user: User): Promise<RoomAvailabilityCell[]> {
    if (!canCreateBooking(user.role)) {
        throw new Error("Unauthorised to view room availability.")
    }

    const roomSnapshot = await db.collection("rooms").doc(roomId).get()
    if (!roomSnapshot.exists) {
        throw new Error("Room not found.")
    }

    const room = roomSnapshot.data() as Room
    if (room.schoolId !== user.schoolId) {
        throw new Error("Not authorised for this room.")
    }

    const bookingSnapshot = await db.collection("bookings")
        .where("schoolId", "==", user.schoolId)
        .where("roomId", "==", roomId)
        .where("status", "==", "approved")
        .get()
    const approvedBookings = bookingSnapshot.docs.map((doc) => doc.data() as BookingRequest)

    return buildRoomAvailabilityCells(room, approvedBookings)
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
    const { start, end } = parseBookingInterval(input.startTime, input.endTime)
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
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
    const eligibleRooms = rooms.filter(room => {
        try {
            validateBookingInterval(input.startTime, input.endTime, room.rules)
        } catch {
            return false
        }

        return room.rules.allowedDays.includes(weekday) &&
        room.rules.allowedYearLevels.includes(Number(user.yearLevel)) &&
        room.rules.openHour * 60 <= startMinutes &&
        room.rules.closeHour * 60 >= endMinutes
    })

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