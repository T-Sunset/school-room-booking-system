// Strike.ts
export type Strike = {
    id:string,
    userId:string,
    schoolId:string,
    issuedBy:string,
    issuedAt:string,
    expiresAt:string,
    reason:string,
    bandId?:string
}
