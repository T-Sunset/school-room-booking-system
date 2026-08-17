// auth.ts
import { Request } from "express"
import { User } from "../models/User"

// Define an Express Request w/ authenticated token functionality 
export interface AuthenticatedRequest extends Request {
    user: User
}