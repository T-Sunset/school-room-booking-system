// Import the functions you need from the SDKs you need
import {initializeApp} from "firebase/app"
import {getAuth} from "firebase/auth"
import {frontendEnvironment} from "./config/environment"

const firebaseConfig = {
  apiKey: frontendEnvironment.VITE_FIREBASE_API_KEY,
  authDomain: frontendEnvironment.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: frontendEnvironment.VITE_FIREBASE_PROJECT_ID,
  storageBucket: frontendEnvironment.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: frontendEnvironment.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: frontendEnvironment.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export our authorisation 
export const auth = getAuth(app)