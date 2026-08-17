// bandService.ts
import { db } from "../config/firebase"
import { Band, BandStatus } from "../models/Band"
import { RULES } from "../models/Rules"
import { canApproveBooking, canCreateBooking } from "../rbac/can"
import type { User } from "../models/User"

// Create a Band 
export async function createBand(input:Band, user:User) {
    // Abort if the user cannot create bands 
    if (!canCreateBooking(user.role)) { throw new Error("Not authorised to create bands.") }

    // Get request information to variables 
    const schoolId = user.schoolId
    const createdBy = user.id
    const name = input.name.trim()
    const nameNormalised = input.name
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
    let memberIds = [...new Set(input.memberIds)]
    if (!memberIds.includes(user.id)) { memberIds.push(user.id) }

    // Go through adequate validation steps 
    // 1: Ensure all fields exist 
    if (!schoolId || !name || !createdBy || !memberIds) { throw new Error("Missing required fields.") }
    // 2: Ensure all fields are strings 
    if (typeof schoolId !== "string" || typeof name !== "string" || typeof createdBy !== "string" || !isStringArray(memberIds)) { 
        throw new Error("All fields must be of valid data types.")
    }
    // 3: Ensure there are no existing bands at the same school with the same name 
    const snapshot = await db.collection("bands") // Get a snapshot of any existing identical bands
    .where("schoolId","==",schoolId)
    .where("nameNormalised","==",nameNormalised)
    .where("status", "in", ["pending", "approved"])
    .get()
    if (snapshot.size > 0) { throw new Error("Band with that name already exists.")}

    // If we haven't thrown any errors, time to put on the pending list. 
    const status = "pending"

    // Set Time 
    const createdAt = new Date().toISOString()

    // Save band 
    const docRef = await db.collection("bands").add({
        schoolId,
        name,
        nameNormalised,
        createdBy,
        memberIds,
        status,
        createdAt
    })
    // Return OK!
    return {
        id:docRef.id,
        schoolId,
        name,
        nameNormalised,
        createdBy,
        memberIds,
        status,
        createdAt
    }
}

// Approve a Band 
export async function approveBand(bandId:string, user:User) {
    // Can this user do this?
    if (!canApproveBooking(user.role)) { throw new Error("Unauthorised to approve band applications.") }

    // Fetch the band
    const ref = db.collection("bands").doc(bandId) // Get the document reference
    const snap = await ref.get()

    // Does the band exist?
    if (!snap.exists) { throw new Error("Band not found.") }

    // Get the snapshot to data.
    const band = snap.data()

    // Is the band pending?
    if (band?.status !== "pending") { throw new Error("Bands must be 'pending' in order to be approved or denied.") }

    // Does the user have authority over this band?
    if (band?.schoolId !== user.schoolId) { throw new Error("Unauthorised to approve applications for this band from this school.") }

    // Update the Band to be approved
    await ref.update({
        status:"approved",
        approvedBy:user.id,
        approvedAt:new Date().toISOString()
    })
}
// Deny a Band 
export async function denyBand(bandId:string, user:User) {
    // Can this user do this?
    if (!canApproveBooking(user.role)) { throw new Error("Unauthorised to deny band applications.") }

    // Fetch the band
    const ref = db.collection("bands").doc(bandId) // Get the document reference
    const snap = await ref.get()

    // Does the band exist?
    if (!snap.exists) { throw new Error("Band not found.") }

    // Get the snapshot to data.
    const band = snap.data()

    // Is the band pending?
    if (band?.status !== "pending") { throw new Error("Bands must be 'pending' in order to be approved or denied.") }

    // Does the user have authority over this band?
    if (band?.schoolId !== user.schoolId) { throw new Error("Unauthorised to approve applications for this band from this school.") }

    // Update the Band to be approved
    await ref.update({
        status:"denied",
        approvedBy:user.id,
        approvedAt:new Date().toISOString()
    })
}

// Get pending bands 
export async function getPendingBands(user:User) {
    // Ensure this user has the permissions to do this 
    if (!canApproveBooking(user.role)) { throw new Error("Unauthorised to view pending bands.") }

    // Get valid band applications 
    const snapshot = await db
    .collection("bands")
    .where("schoolId","==",user.schoolId)
    .where("status","==","pending")
    .orderBy("createdAt")
    .get()

    // Convert to JSON and return 
    return snapshot.docs.map(doc => ({
        id:doc.id,
        ...doc.data()
    }))
}

// Is String array helper function 
const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === "string");
};
