// strikeService.ts
import { db } from "../config/firebase"
import { Strike } from "../models/Strike"
import { Band } from "../models/Band"
import { canManageStudents } from "../rbac/can"
import type { User } from "../models/User"

const STRIKE_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export type StrikeStatus = {
    activeStrikeCount:number,
    hasWarning:boolean,
    isBanned:boolean,
    banExpiresAt:string|null
}

export function getStrikeStatusFromStrikes(strikes:Strike[], now = Date.now()): StrikeStatus {
    const orderedStrikes = [...strikes].sort((a, b) => {
        const issuedAtDifference = new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime()
        return issuedAtDifference || a.id.localeCompare(b.id)
    })

    let maxBanExpiresAt: number | null = null

    for (let i = 0; i < orderedStrikes.length; i++) {
        const strike = orderedStrikes[i]
        const issuedAt = new Date(strike.issuedAt).getTime()
        const hasEarlierActiveStrike = orderedStrikes
            .slice(0, i)
            .some((earlier) => new Date(earlier.expiresAt).getTime() > issuedAt)

        if (hasEarlierActiveStrike) {
            const banExpiresAt = issuedAt + STRIKE_DURATION_MS
            if (maxBanExpiresAt === null || banExpiresAt > maxBanExpiresAt) {
                maxBanExpiresAt = banExpiresAt
            }
        }
    }

    const activeStrikeCount = orderedStrikes.filter((strike) => new Date(strike.expiresAt).getTime() > now).length
    const isBanned = maxBanExpiresAt !== null && now < maxBanExpiresAt

    return {
        activeStrikeCount,
        hasWarning: activeStrikeCount >= 1 && !isBanned,
        isBanned,
        banExpiresAt: isBanned ? new Date(maxBanExpiresAt as number).toISOString() : null
    }
}

// Fetch a student's strikes and derive their current warning/ban status
export async function getStudentStrikeStatus(userId:string, schoolId:string): Promise<StrikeStatus> {
    const snapshot = await db.collection("strikes")
        .where("userId", "==", userId)
        .where("schoolId", "==", schoolId)
        .get()

    const strikes = snapshot.docs
        .map((doc) => ({ ...doc.data(), id: doc.id } as Strike))
    return getStrikeStatusFromStrikes(strikes)
}

// Shared strike construction used by both individual and band strikes
function buildStrikeDoc(targetUserId:string, schoolId:string, issuedBy:string, reason:string, bandId?:string) {
    const issuedAt = new Date().toISOString()
    const expiresAt = new Date(new Date(issuedAt).getTime() + STRIKE_DURATION_MS).toISOString()

    const docRef = db.collection("strikes").doc()
    const strike: Strike = {
        id: docRef.id,
        userId: targetUserId,
        schoolId,
        issuedBy,
        issuedAt,
        expiresAt,
        reason,
        ...(bandId ? { bandId } : {})
    }

    return { docRef, strike }
}

async function createStrikeDoc(targetUserId:string, schoolId:string, issuedBy:string, reason:string, bandId?:string) {
    const { docRef, strike } = buildStrikeDoc(targetUserId, schoolId, issuedBy, reason, bandId)
    await docRef.set(strike)
    return strike
}

// Issue a strike to a single student
export async function issueStrike(targetUserId:string, reason:string, issuer:User) {
    if (typeof issuer.schoolId !== "string" || !issuer.schoolId.trim()) { throw new Error("Issuer is not assigned to a valid school.") }
    if (!canManageStudents(issuer.role)) { throw new Error("Unauthorised to issue strikes.") }
    if (!reason || !reason.trim()) { throw new Error("A reason is required to issue a strike.") }

    const targetSnap = await db.collection("users").doc(targetUserId).get()
    if (!targetSnap.exists) { throw new Error("Student not found.") }

    const target = targetSnap.data() as User
    if (target.role !== "student") { throw new Error("Strikes can only be issued to students.") }
    if (target.schoolId !== issuer.schoolId) { throw new Error("Unauthorised to issue strikes for this school.") }

    return createStrikeDoc(targetUserId, issuer.schoolId, issuer.id, reason)
}

// Issue an individual strike to every current member of an approved band
export async function issueBandStrike(bandId:string, reason:string, issuer:User) {
    if (typeof issuer.schoolId !== "string" || !issuer.schoolId.trim()) { throw new Error("Issuer is not assigned to a valid school.") }
    if (!canManageStudents(issuer.role)) { throw new Error("Unauthorised to issue strikes.") }
    if (!reason || !reason.trim()) { throw new Error("A reason is required to issue a strike.") }

    const bandSnap = await db.collection("bands").doc(bandId).get()
    if (!bandSnap.exists) { throw new Error("Band not found.") }

    const band = bandSnap.data() as Band
    if (band.schoolId !== issuer.schoolId) { throw new Error("Unauthorised to issue strikes for this school.") }
    if (band.status !== "approved") { throw new Error("Strikes can only be issued to approved bands.") }
    if (!Array.isArray(band.memberIds) || band.memberIds.length === 0 || band.memberIds.some((memberId) => typeof memberId !== "string" || !memberId.trim())) {
        throw new Error("Approved band must have at least one valid member.")
    }

    const memberProfiles = await Promise.all(
        band.memberIds.map(async (memberId) => {
            const memberSnap = await db.collection("users").doc(memberId).get()
            if (!memberSnap.exists) { throw new Error(`Band member '${memberId}' was not found.`) }

            const member = memberSnap.data() as User
            if (member.role !== "student") { throw new Error(`Band member '${memberId}' is not a student.`) }
            if (member.schoolId !== issuer.schoolId) { throw new Error(`Band member '${memberId}' is not from the issuer's school.`) }

            return memberId
        })
    )

    const batch = db.batch()
    const strikes = memberProfiles.map((memberId) => {
        const { docRef, strike } = buildStrikeDoc(memberId, issuer.schoolId, issuer.id, reason, bandId)
        batch.set(docRef, strike)
        return strike
    })

    await batch.commit()
    return strikes
}
