// Band.ts

export type BandStatus = "pending" | "approved" | "denied" | "disbanded"

export interface Band {
    id: string,
    schoolId: string,
    name: string,
    nameNormalised: string,
    createdBy: string,
    memberIds: string[],
    status: BandStatus,
    createdAt: string,
    approvedBy?: string,
    approvedAt?: string,
    disbandedAt?: string
}

export interface SchoolStudent {
    id: string,
    email: string,
    yearLevel: number | null,
}

export interface CreateBandRequest {
    name: string,
    memberIds: string[],
}

export interface CreateBandResponse {
    message: string,
    band: Band,
}
