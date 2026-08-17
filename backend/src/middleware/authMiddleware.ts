// authMiddleware.ts
import {Request, Response, NextFunction} from "express"
import admin from "firebase-admin"
import { AuthenticatedRequest } from "../types/auth"
import { db } from "../config/firebase"
import { getUserById } from "../services/userService"

// Before we allow requests to pass through, we have to verify the user trying to make the request as valid 
export async function authMiddleware(req:AuthenticatedRequest, res:Response, next:NextFunction) {
    // Attempt to validate 
    try {
        // Get header 
        const authHeader = req.headers.authorization

        // Does the header exist, and is it in the right format?
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({error:"Missing auth token"})
        }

        // Get our user's actual token 
        const token = authHeader.split("Bearer ")[1]

        // Decode and verify it
        const decodedToken = await admin.auth().verifyIdToken(token)

        // Get this user's user information 
        const userReference = db.collection("users").doc(decodedToken.uid)
       let userSnapshot
        try {
            userSnapshot = await getUserById(decodedToken.uid)
        } catch (e) {
            console.error("getUserById failed:", e)
            throw e
        }
        // Does the user not exist?
        if (userSnapshot === null) {
            throw new Error("User profile not found.") // Throw error
        }

        // Attach to the request inbound 
        const userDoc = await userReference.get()
        req.user = {
            id:decodedToken.uid,
            email:decodedToken.email,
            role:userDoc.data()?.role,
            schoolId:userDoc.data()?.schoolId,
            yearLevel:userDoc.data()?.yearLevel,
            createdAt:userDoc.data()?.createdAt
        }

        // Go next 
        next()
    } catch (err) {
        // Error with validation 
        console.error("MIDDLEWARE ERROR:", err)
        return res.status(401).json({error:err.message})
    }
}

// Allow sign-up requests with ONLY validated Firebase Auth tokens (for users that do not yet have user documents in database)
export async function authTokenOnly(req:AuthenticatedRequest, res:Response, next:NextFunction) {
        // Get header 
        const authHeader = req.headers.authorization

        // Does the header exist, and is it in the right format?
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({error:"Missing auth token"})
        }

        // Get our user's actual token 
        const token = authHeader.split("Bearer ")[1]

        // Decode and verify it
        const decodedToken = await admin.auth().verifyIdToken(token)

        // Attach to the request inbound 
        req.user = {
            id:decodedToken.uid,
            email:decodedToken.email
        }

        // Go next
        next()
}