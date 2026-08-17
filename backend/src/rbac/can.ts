// can.ts
import { permissions } from "./permissions"
import { UserRole } from "../models/User"

// Functions 
export function canCreateBooking(role: UserRole) {
    return permissions[role].createBooking
}
export function canApproveBooking(role: UserRole) {
    return permissions[role].approveBooking
}
export function canOverrideRules(role: UserRole) {
    return permissions[role].overrideRules
}