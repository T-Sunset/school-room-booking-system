import { Timestamp } from "firebase-admin/firestore"
import type { Transaction } from "firebase-admin/firestore"
import { db } from "../config/firebase"
import type { User } from "../models/User"
import type { AuditAction, AuditEntityType, AuditEvent, AuditMetadata } from "../models/AuditEvent"
import { canViewAuditLogs } from "../rbac/can"

type LogAuditEventInput = {
    actor: User
    action: AuditAction
    entityType: AuditEntityType
    entityId: string
    metadata?: AuditMetadata
}

export async function logAuditEvent(input: LogAuditEventInput, transaction?: Transaction): Promise<AuditEvent> {
    const { actor, action, entityType, entityId, metadata } = input
    if (!actor.id || !actor.email || typeof actor.schoolId !== "string" || !actor.schoolId.trim()) {
        throw new Error("A valid authenticated actor and school are required to create an audit event.")
    }
    if (!entityId || !entityId.trim()) {
        throw new Error("An entity ID is required to create an audit event.")
    }

    const reference = db.collection("auditLogs").doc()
    const event: AuditEvent = {
        id: reference.id,
        schoolId: actor.schoolId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        action,
        entityType,
        entityId,
        occurredAt: Timestamp.now(),
        ...(metadata ? { metadata } : {})
    }

    if (transaction) {
        transaction.create(reference, event)
    } else {
        await reference.create(event)
    }
    return event
}

export type AuditLogFilters = {
    from?: string
    to?: string
    action?: string
    actor?: string
    entityType?: string
    pageSize?: string
    cursor?: string
}

export type AuditLogResponse = {
    events: Array<{
        id: string
        timestamp: string
        actor: { id: string, email: string }
        action: AuditAction
        entityType: AuditEntityType
        entityId: string
        metadata?: AuditMetadata
    }>
    nextCursor: string | null
    hasMore: boolean
}

const AUDIT_PAGE_SIZE = 25
const MAX_AUDIT_PAGE_SIZE = 50
const AUDIT_SCAN_BATCH_SIZE = 50
const MAX_AUDIT_SCAN_BATCHES = 10

function parseDateFilter(value: string | undefined, label: string): number | undefined {
    if (!value) return undefined
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T${label === "end" ? "23:59:59.999" : "00:00:00.000"}Z`)
        : new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid audit ${label} date.`)
    }
    return parsed.getTime()
}

function decodeAuditCursor(value: string | undefined): { occurredAt: number, id: string } | undefined {
    if (!value) return undefined
    try {
        const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
        if (typeof decoded.occurredAt !== "number" || typeof decoded.id !== "string" || !decoded.id) {
            throw new Error()
        }
        return decoded
    } catch {
        throw new Error("Invalid audit pagination cursor.")
    }
}

function encodeAuditCursor(occurredAt: number, id: string): string {
    return Buffer.from(JSON.stringify({ occurredAt, id })).toString("base64url")
}

export async function getAuditLogs(user: User, filters: AuditLogFilters): Promise<AuditLogResponse> {
    if (!canViewAuditLogs(user.role)) {
        throw new Error("Unauthorised to view audit logs.")
    }
    if (typeof user.schoolId !== "string" || !user.schoolId.trim()) {
        throw new Error("User is not assigned to a valid school.")
    }

    const fromTime = parseDateFilter(filters.from, "start")
    const toTime = parseDateFilter(filters.to, "end")
    if (fromTime !== undefined && toTime !== undefined && fromTime > toTime) {
        throw new Error("Audit start date must be before the end date.")
    }

    const requestedPageSize = Number(filters.pageSize ?? AUDIT_PAGE_SIZE)
    const pageSize = Number.isInteger(requestedPageSize)
        ? Math.min(Math.max(requestedPageSize, 1), MAX_AUDIT_PAGE_SIZE)
        : AUDIT_PAGE_SIZE
    const cursor = decodeAuditCursor(filters.cursor)
    let query = db.collection("auditLogs")
        .where("schoolId", "==", user.schoolId)
        .orderBy("occurredAt", "desc")
        .orderBy("__name__", "desc")

    if (cursor) {
        query = query.startAfter(Timestamp.fromMillis(cursor.occurredAt), cursor.id)
    }

    const matchingEvents: AuditLogResponse["events"] = []
    let lastScannedCursor = cursor
    let hasMore = false

    for (let batchNumber = 0; batchNumber < MAX_AUDIT_SCAN_BATCHES && matchingEvents.length <= pageSize; batchNumber++) {
        const snapshot = await query.limit(AUDIT_SCAN_BATCH_SIZE).get()
        if (snapshot.empty) break

        for (const document of snapshot.docs) {
            const data = document.data() as AuditEvent
            const occurredAt = data.occurredAt.toDate()
            lastScannedCursor = { occurredAt: occurredAt.getTime(), id: document.id }

            const matchesDate = (fromTime === undefined || occurredAt.getTime() >= fromTime) &&
                (toTime === undefined || occurredAt.getTime() <= toTime)
            const matchesAction = !filters.action || data.action === filters.action
            const matchesActor = !filters.actor || data.actorUserId === filters.actor || data.actorEmail === filters.actor
            const matchesEntityType = !filters.entityType || data.entityType === filters.entityType
            if (!matchesDate || !matchesAction || !matchesActor || !matchesEntityType) continue

            matchingEvents.push({
                id: document.id,
                timestamp: occurredAt.toISOString(),
                actor: { id: data.actorUserId, email: data.actorEmail },
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                ...(data.metadata ? { metadata: data.metadata } : {})
            })
            if (matchingEvents.length > pageSize) break
        }

        if (matchingEvents.length > pageSize || snapshot.size < AUDIT_SCAN_BATCH_SIZE) {
            hasMore = matchingEvents.length > pageSize
            break
        }

        query = query.startAfter(
            Timestamp.fromMillis(lastScannedCursor?.occurredAt ?? 0),
            lastScannedCursor?.id ?? ""
        )
        hasMore = true
    }

    const events = matchingEvents.slice(0, pageSize)
    const lastReturnedEvent = events[events.length - 1]
    const nextCursorValue = matchingEvents.length > pageSize && lastReturnedEvent
        ? { occurredAt: new Date(lastReturnedEvent.timestamp).getTime(), id: lastReturnedEvent.id }
        : lastScannedCursor
    const nextCursor = hasMore && nextCursorValue
        ? encodeAuditCursor(nextCursorValue.occurredAt, nextCursorValue.id)
        : null

    return { events, nextCursor, hasMore }
}