// Attendance.ts
export type AttendanceStatus = "present" | "absent"

export type Attendance = {
    id:string,
    studentId:string,
    status:AttendanceStatus,
    schoolId:string,
    recordedBy:string,
    recordedAt:string,
    updatedBy:string,
    updatedAt:string
}