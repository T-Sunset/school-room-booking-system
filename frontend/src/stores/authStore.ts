// authStore.ts
import {defineStore} from "pinia"
import type { UserRole } from "../types/UserRole"

// Allow use of the Auth store
export const useAuthStore = defineStore("auth", {
    // Define Pinia store's default state
    state: () => ({
        role: "na" as UserRole,
        uid: "",
        email: "",
        yearLevel: 7,
        loaded: false,
    }),

    // Define the actions available for the store 
    actions: {
        // Set the user fields
        setUser(user:{uid:string, email:string, role:UserRole, yearLevel:number}) {
            this.uid = user.uid
            this.email = user.email
            this.role = user.role
            this.yearLevel = user.yearLevel
            this.loaded = true
        },
        // Clear the user fields
        clearUser() {
            this.uid = ""
            this.email = ""
            this.role = "na"
            this.yearLevel = 0
            this.loaded = false
        }
    }
})