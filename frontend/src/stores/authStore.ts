// authStore.ts
import {defineStore} from "pinia"
import type { UserRole } from "../types/UserRole"
import type { StrikeStatus } from "../types/Strike"

const emptyStrikeStatus = (): StrikeStatus => ({
    activeStrikeCount: 0,
    hasWarning: false,
    isBanned: false,
    banExpiresAt: null
})

// Allow use of the Auth store
export const useAuthStore = defineStore("auth", {
    // Define Pinia store's default state
    state: () => ({
        role: "na" as UserRole,
        uid: "",
        email: "",
        yearLevel: 7,
        strikeStatus: emptyStrikeStatus(),
        loaded: false,
    }),

    // Define the actions available for the store 
    actions: {
        // Set the user fields
        setUser(user:{uid:string, email:string, role:UserRole, yearLevel:number, strikeStatus?:StrikeStatus}) {
            this.uid = user.uid
            this.email = user.email
            this.role = user.role
            this.yearLevel = user.yearLevel
            this.strikeStatus = user.strikeStatus ?? emptyStrikeStatus()
            this.loaded = true
        },
        setStrikeStatus(strikeStatus:StrikeStatus) {
            this.strikeStatus = strikeStatus
        },
        // Clear the user fields
        clearUser() {
            this.uid = ""
            this.email = ""
            this.role = "na"
            this.yearLevel = 0
            this.strikeStatus = emptyStrikeStatus()
            this.loaded = false
        }
    }
})