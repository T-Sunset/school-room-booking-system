import api from "./api"
import type { AuditLogResponse } from "../types/AuditLog"

export type AuditLogQuery = {
    from?: string
    to?: string
    action?: string
    actor?: string
    entityType?: string
    pageSize?: number
    cursor?: string
}

export async function getAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResponse> {
    const response = await api.get<AuditLogResponse>("/audit-logs", { params: query })
    return response.data
}