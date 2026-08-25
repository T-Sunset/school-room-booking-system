// bandService.ts
import { db } from "../config/firebase"
import { Band } from "../models/Band"
import { canApproveBooking } from "../rbac/can"
import type { User } from "../models/User"

export function normaliseBandMemberIds(input: unknown, creatorId: string): string[] {
    const rawMembers = Array.isArray(input) ? input : []
    const cleaned = rawMembers
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)

    const deduped = [...new Set(cleaned)]
    if (!deduped.includes(creatorId)) {
        deduped.push(creatorId)
    }

    return deduped
}

function hasSameMembers(first: string[], second: string[]): boolean {
    if (first.length !== second.length) {
        return false
    }

    const firstSorted = [...first].sort()
    const secondSorted = [...second].sort()
    return firstSorted.every((memberId, index) => memberId === secondSorted[index])
}

export function validateBandMemberIds(
    memberIds: string[],
    creatorId: string,
    schoolId: string,
    memberProfiles: Array<{ id: string, role?: string, schoolId?: string }>
): string[] {
    if (!creatorId) {
        throw new Error("Creator ID is required.")
    }
    if (!schoolId) {
        throw new Error("School ID is required.")
    }

    const dedupedMembers = [...new Set(memberIds.map((id) => String(id).trim()).filter(Boolean))]
    if (!dedupedMembers.includes(creatorId)) {
        dedupedMembers.push(creatorId)
    }

    if (dedupedMembers.length < 2) {
        throw new Error("A band must contain at least two students total.")
    }

    const validMembers: string[] = []
    const seen = new Set<string>()

    for (const memberId of dedupedMembers) {
        if (seen.has(memberId)) {
            continue
        }
        seen.add(memberId)

        const member = memberProfiles.find((profile) => profile.id === memberId)
        if (!member) {
            throw new Error(`Selected member '${memberId}' was not found.`)
        }
        if (member.role !== "student") {
            throw new Error(`Selected member '${memberId}' is not a student.`)
        }
        if (member.schoolId !== schoolId) {
            throw new Error(`Selected member '${memberId}' is not from the same school.`)
        }

        validMembers.push(memberId)
    }

    if (validMembers.length < 2) {
        throw new Error("A band must contain at least two students total.")
    }

    return validMembers
}

// Create a Band 
export async function createBand(input: Partial<Band>, user: User) {
    if (user.role !== "student") {
        throw new Error("Only students can create band proposals.")
    }

    const schoolId = user.schoolId
    const createdBy = user.id
    const name = typeof input.name === "string" ? input.name.trim() : ""
    const nameNormalised = name
        .replace(/\s+/g, " ")
        .toLowerCase()

    if (!schoolId || !createdBy) {
        throw new Error("User is not assigned to a valid school.")
    }
    if (!name) {
        throw new Error("Band name is required.")
    }

    const memberIds = normaliseBandMemberIds(input.memberIds, createdBy)
    if (memberIds.length < 2) {
        throw new Error("A band must contain at least two students total.")
    }

    const memberProfiles = await Promise.all(
        memberIds.map(async (memberId) => {
            const snap = await db.collection("users").doc(memberId).get()
            if (!snap.exists) {
                throw new Error(`Selected member '${memberId}' was not found.`)
            }

            const data = snap.data()
            return {
                id: memberId,
                role: data?.role,
                schoolId: data?.schoolId
            }
        })
    )

    const validMemberIds = validateBandMemberIds(memberIds, createdBy, schoolId, memberProfiles)

    const status = "pending"
    const createdAt = new Date().toISOString()
    const docRef = db.collection("bands").doc()
    const bandData = {
        schoolId,
        name,
        nameNormalised,
        createdBy,
        memberIds: validMemberIds,
        status,
        createdAt
    }

    await db.runTransaction(async (transaction) => {
        const schoolBands = await transaction.get(db.collection("bands").where("schoolId", "==", schoolId))

        if (schoolBands.docs.some((doc) => (doc.data() as Band).nameNormalised === nameNormalised)) {
            throw new Error("Band with that name already exists.")
        }

        const duplicateMembers = schoolBands.docs.some((doc) => {
            const band = doc.data() as Band
            return hasSameMembers(band.memberIds ?? [], validMemberIds)
        })

        if (duplicateMembers) {
            throw new Error("A band with these same members already exists.")
        }

        transaction.create(docRef, bandData)
    })

    return {
        id: docRef.id,
        schoolId,
        name,
        nameNormalised,
        createdBy,
        memberIds: validMemberIds,
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

// Get all bands where the authenticated student is a member.
export async function getBandsForUser(user: User) {
    if (!user.id || !user.schoolId) {
        throw new Error("User is not assigned to a valid school.")
    }

    const snapshot = await db.collection("bands")
        .where("schoolId", "==", user.schoolId)
        .where("memberIds", "array-contains", user.id)
        .get()

    return snapshot.docs
        .map((doc): Band => ({
            id: doc.id,
            ...doc.data()
        } as Band))
        .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
}

