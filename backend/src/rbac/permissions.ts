// permissions.ts

export const permissions = {
    student: {
        createBooking: true,
        approveBooking: false,
        overrideRules: false
    },
    teacher: {
        createBooking: true,
        approveBooking: true,
        overrideRules: false
    },
    admin: {
        createBooking: true,
        approveBooking: true,
        overrideRules: true,
    }
} as const