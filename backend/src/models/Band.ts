// Band.ts
export type BandStatus = 
    | "pending"
    | "approved"
    | "denied"

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
    approvedAt?:string
}