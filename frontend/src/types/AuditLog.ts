export type AuditAction =
    | "user.profile_created"
    | "user.role_changed"
    | "room.created"
    | "room.updated"
    | "room.deactivated"
    | "room.reactivated"
    | "booking.created"
    | "booking.approved"
    | "booking.denied"
    | "booking.cancelled"
    | "band.created"
    | "band.member_left"
    | "band.approved"
    | "band.denied"
    | "band.disbanded"
    | "strike.issued"
    | "band.strike_issued"
    | "attendance.marked"
    | "attendance.changed"

export type AuditEntityType = "user" | "room" | "booking" | "band" | "strike" | "attendance"

export type AuditMetadata = Record<string, string | number | boolean | null>

export type AuditLogEvent = {
    id: string
    timestamp: string
    actor: { id: string, email: string }
    action: AuditAction
    entityType: AuditEntityType
    entityId: string
    metadata?: AuditMetadata
}

export type AuditLogResponse = {
    events: AuditLogEvent[]
    nextCursor: string | null
    hasMore: boolean
}