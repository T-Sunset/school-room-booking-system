// userService.ts
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import api from "./api";
import { useAuthStore } from "../stores/authStore";
import type { User as FirebaseUser } from "firebase/auth";
import type { StudentRosterEntry } from "../types/Student";
import type { StrikeStatus } from "../types/Strike";

// Actual Login function; Error handling in callers
export async function login(rememberMe:boolean, email:string, password:string) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence) // Use locally saved remember me if toggled on.
    const user = await signInWithEmailAndPassword(auth, email, password) // Attempt a login

    // Query database and get user (GET users/:id)
    const uid = user.user.uid
    const response = await api.get(`/users/${uid}`)

    // Apply to Pinia Auth store
    const authStore = useAuthStore()
    authStore.setUser({uid, email, role:response.data.role, yearLevel:response.data.yearLevel})
    await hydrateStudentStrikeStatus(response.data.role)
}

// Logout Function ; Error handling in callers
export async function logout() {
    // Run auth sign out
    await signOut(auth)

    // Log out the Pinia auth store
    const authStore = useAuthStore()
    authStore.clearUser()
}

// Check if we are logged in
export function isLoggedIn() {
    // Return whether or not our auth has a currentUser value
    return !!auth.currentUser
}


// Await Firebase to confirm whether or not we're already logged in before each router page
export async function waitForAuth(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe()
            resolve(user)
        })
    })
}

export async function getStudentRoster(): Promise<StudentRosterEntry[]> {
    const response = await api.get("/students/roster")
    return response.data
}

export async function issueStudentStrike(userId:string, reason:string) {
    const response = await api.post("/strikes", { userId, reason })
    return response.data
}

export async function getMyStrikeStatus(): Promise<StrikeStatus> {
    const response = await api.get("/strikes/mine")
    return response.data
}

async function hydrateStudentStrikeStatus(role:string) {
    if (role !== "student") return

    const authStore = useAuthStore()
    authStore.setStrikeStatus(await getMyStrikeStatus())
}

// Restore the authenticated user's profile after a full page refresh.
export async function hydrateCurrentUser() {
    const user = await waitForAuth()
    const authStore = useAuthStore()

    if (!user) {
        authStore.clearUser()
        return
    }

    const response = await api.get(`/users/${user.uid}`)
    authStore.setUser({
        uid: user.uid,
        email: user.email || "",
        role: response.data.role,
        yearLevel: response.data.yearLevel
    })
    await hydrateStudentStrikeStatus(response.data.role)
}

// Sign Up!
export async function signUp(email:string, password:string, yearLevel:number) {
    try {
        // Create user in Firebase Auth if possible
        const userCredentials = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredentials.user

        // Wait for Authorisation
        await waitForAuth()

        // Get our user token
        // Query back-end to register our user with a new user document within the database
        const response = await api.post("/users", {yearLevel})
        console.log("Response: ", response.data)

         // Query database and get user (GET users/:id)
        const uid = user.uid
        // Apply to Pinia Auth store
        const authStore = useAuthStore()
        authStore.setUser({uid, email, role:response.data.result.role, yearLevel})
        await hydrateStudentStrikeStatus(response.data.result.role)
    } catch (err:any) {
        console.log("Sign-up failed: ", err.response?.data || err.message)
    }
}