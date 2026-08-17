// User.ts
export type UserRole = "student" | "teacher" | "admin"

export type User = {
    id:string, 
    email:string,
    role?:UserRole,
    schoolId?:string,
    yearLevel?:string,
    createdAt?:string
}