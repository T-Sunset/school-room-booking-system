// Import the functions you need from the SDKs you need
import {initializeApp} from "firebase/app"
import {getAuth} from "firebase/auth"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAqZM9mXYJmHm6QT9nafMh8TiQ5pMPLkE",
  authDomain: "roombooking-5d20d.firebaseapp.com",
  projectId: "roombooking-5d20d",
  storageBucket: "roombooking-5d20d.firebasestorage.app",
  messagingSenderId: "329032380974",
  appId: "1:329032380974:web:862b27df89fe7f5f1325bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export our authorisation 
export const auth = getAuth(app)