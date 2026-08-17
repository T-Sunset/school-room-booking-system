// firebase.ts
import admin from "firebase-admin"
import serviceAccount from "../../serviceAccountKey.json"

// Initialise our Firebase & Admin credentials (connect to Firebase project)
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
})

// Get our Database 
export const db = admin.firestore()