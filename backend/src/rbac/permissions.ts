// permissions.ts

export const permissions = {
    student: {
        createBooking: true,
        approveBooking: false,
        overrideRules: false,
        manageStudents: false,
        recordAttendance: false
    },
    teacher: {
        createBooking: true,
        approveBooking: true,
        overrideRules: false,
        manageStudents: true,
        recordAttendance: true
    },
    admin: {
        createBooking: true,
        approveBooking: true,
        overrideRules: true,
        manageStudents: true,
        recordAttendance: true
    }
} as const