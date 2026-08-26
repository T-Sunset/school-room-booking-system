// Band.ts
export type BandStatus = 
    | "pending"
    | "approved"
    | "denied"
    | "disbanded"

export type Band = {
    id:string,
    schoolId:string,
    name:string,
    nameNormalised:string,
    createdBy:string,
    memberIds:string[],
    status: BandStatus,
    createdAt: string,
    approvedBy?:string,
    approvedAt?:string,
    disbandedAt?:string
}