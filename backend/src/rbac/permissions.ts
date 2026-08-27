// permissions.ts

export const permissions = {
    student: {
        createBooking: true,
        approveBooking: false,
        overrideRules: false,
        manageStudents: false
    },
    teacher: {
        createBooking: true,
        approveBooking: true,
        overrideRules: false,
        manageStudents: true
    },
    admin: {
        createBooking: true,
        approveBooking: true,
        overrideRules: true,
        manageStudents: true
    }
} as const