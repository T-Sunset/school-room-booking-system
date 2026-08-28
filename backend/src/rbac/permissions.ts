// permissions.ts

export const permissions = {
    student: {
        createBooking: true,
        approveBooking: false,
        overrideRules: false,
        manageStudents: false,
        recordAttendance: false,
        viewAuditLogs: false
    },
    teacher: {
        createBooking: true,
        approveBooking: true,
        overrideRules: false,
        manageStudents: true,
        recordAttendance: true,
        viewAuditLogs: false
    },
    admin: {
        createBooking: true,
        approveBooking: true,
        overrideRules: true,
        manageStudents: true,
        recordAttendance: true,
        viewAuditLogs: true
    }
} as const