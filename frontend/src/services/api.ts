// api.ts 
import axios from "axios"
import {auth} from "../firebase"
import {frontendEnvironment} from "../config/environment"

// Run Axios to allow JSON transfer of data from front to back-end and back 
const api = axios.create({
    baseURL: frontendEnvironment.VITE_API_BASE_URL
})

// Add middleware / request interceptor to append our authentication key to requests to backend 
api.interceptors.request.use(async (config) => {
    // Get current user 
    const user = auth.currentUser

    // Does our user exist?
    if (user) {
        // Get token 
        const token = await user.getIdToken(true)

        // Append to requests 
        config.headers.Authorization = `Bearer ${token}`
    }

    // Return 
    return config
})

// Make api public 
export default api