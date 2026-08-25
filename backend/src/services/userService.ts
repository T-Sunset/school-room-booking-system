// userService.ts
import { isNumberObject } from "node:util/types"
import { db } from "../config/firebase"
import { User } from "../models/User"
import { canCreateBooking, canApproveBooking, canOverrideRules } from "../rbac/can"
import { UserRole } from "../models/User"

// Get a User by their UID from firebase firestore 
export async function getUserById(uid:string): Promise<User|null> {
    const doc = await db.collection("users").doc(uid).get() // Get the user's document if possible 

    if (!doc.exists) return null // Doesn't exist, return null 
    return doc.data() as User
}

// Create a New User Document
export async function createUser(input:{yearLevel:string}, user:User) {
    // Get data to variables
    const id = user.id
    const email = user.email
    const domain = email.split("@")[1]

    // Validate year level input
    // Does the input have a yearlevel?
    if (!input.yearLevel) throw new Error("Not all sign-up fields were filled in.")

    // Set yearlevel as int from input
    const yearLevel = Number(input.yearLevel)

    // Is the yearlevel parseable to a number?
    if (Number.isNaN(input.yearLevel)) throw new Error("Invalid year level.")
    
    // Check year level as valid number
    if (yearLevel > 12 || yearLevel < 7) throw new Error("Invalid year level.")
    
    // Assign school
    // Get the school from the email's domain
    const schoolSnapshot = await db.collection("schools")
        .where("domains", "array-contains", domain)
        .get()
    
    // Does this school snapshot exist?
    if (schoolSnapshot.empty) throw new Error("This email domain is not registered to a school.")

    // Apply snapshot
    const schoolId = schoolSnapshot.docs[0].id

    // Ensure that this user is not already signed up
    const userRef = db.collection("users").doc(id)
    const existing = await userRef.get()
    if (existing.exists) throw new Error("User already exists.")

    // Set Time 
    const createdAt = new Date().toISOString()
    
    // Create Firestore entry
    userRef.set({
        id,
        email,
        yearLevel,
        createdAt,
        schoolId,
        role:"student"
    })

    // Done! Return
    return {
        id,
        email,
        yearLevel,
        createdAt,
        schoolId,
        role:"student"
    }
}

// Change a user's role
export async function changeUserRole(userId:string, role:UserRole, user:User) {
    // Ensure Valid Rights
    if (!canOverrideRules(user.role)) throw new Error("Unauthorised to edit user permissions.")
    
    // Fetch the user 
    const ref = db.collection("users").doc(userId)
    const snap = await ref.get()

    // Does the user exist?
    if (!snap.exists) {
        throw new Error("User not found.")
    }

    // Get user snapshot to data 
    const u = snap.data()

    // Set values 
    await ref.update({
        role
    })
}

// View User Documents
export async function getUsers(user) {
     // Ensure valid rights 
    if (!canCreateBooking(user.role)) { throw new Error("Unauthorised to view users.") }

    // Get a snapshot of the Database for all users of the same school
    const snapshot = await db
    .collection("users")
    .where("schoolId","==",user.schoolId)
    .get()

    // Return 
    return snapshot.docs.map(doc => ({
        id:doc.id,
        ...doc.data()
    }))
}

export async function getSchoolStudents(user: User) {
    if (user.role !== "student") {
        throw new Error("Only students can search for school members.")
    }
    if (!user.schoolId) {
        throw new Error("User is not assigned to a school.")
    }

    const snapshot = await db
        .collection("users")
        .where("schoolId", "==", user.schoolId)
        .where("role", "==", "student")
        .get()

    return snapshot.docs.map((doc) => {
        const data = doc.data() as User
        return {
            id: doc.id,
            email: data.email,
            yearLevel: data.yearLevel ?? null
        }
    })
}

// View specific user documents
export async function getSpecificUser(userId:string, user:User) {
    // Ensure Valid Rights
    if (!canCreateBooking(user.role)) throw new Error("Unauthorised to view users.")

    // Get a snapshot containing the target user
    const ref = db.collection("users").doc(userId)
    const snap = await ref.get()

    // Does the user exist, and are they of the same school as the requesting user?
    if (!snap.exists) throw new Error("User not found.")
    const data = snap.data() as User
    if (data.schoolId !== user.schoolId) throw new Error("Unauthorised to view this user. (Wrong school.)")

    // Returns the user document. 
    return {
        id:snap.id,
        ...data
    }
}