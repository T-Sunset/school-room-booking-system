// firebase.ts
import admin from "firebase-admin"
import { existsSync, readFileSync } from "node:fs"
import { serviceAccountKeyPath } from "./environment"

const serviceAccountPath = serviceAccountKeyPath
const firebaseOptions = existsSync(serviceAccountPath)
    ? {
        credential: admin.credential.cert(
            JSON.parse(readFileSync(serviceAccountPath, "utf8")) as admin.ServiceAccount
        )
    }
    : undefined

// Local development can use an ignored key file; managed runtimes use ADC.
admin.initializeApp(firebaseOptions)

// Get our Database 
export const db = admin.firestore()