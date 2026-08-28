// index.ts
import express, {Request, Response} from "express"
import cors from "cors"
import {approveBooking, createBooking, denyBooking, getPendingBookings, getRollcall, getSchoolBookingsForDate, getUserBookings} from "./services/bookingService"
import { createBand, approveBand, denyBand, disbandBand, getActiveBands, getBandsForUser, getPendingBands, leaveBand } from "./services/bandService"
import { authMiddleware, authTokenOnly } from "./middleware/authMiddleware"
import { AuthenticatedRequest } from "./types/auth"
import { createRoom, editRoom, getRooms, getRoomAvailability, getRoomSingle, getRoomWithRequirements, removeRoom } from "./services/roomService"
import { changeUserRole, createUser, getSchoolStudents, getStudentRoster, getSpecificUser, getUsers } from "./services/userService"
import { getStudentStrikeStatus, issueBandStrike, issueStrike } from "./services/strikeService"

// Set up the Express app and middleware
const app = express()
app.use(cors())
app.use(express.json())

// Test route 
app.get("/", (req, res) => {
    res.send("Backend is running")
})

// Health check
app.get("/health", (req:Request, res:Response) => {
    res.json({status:"ok"})
})

// Receive Band application 
app.post("/bands", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await createBand(req.body, req.user)
        return res.status(200).json({
            message:"Band application created.",
            band:result
        })
    } catch(err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// View Band Applications 
app.get("/bands/pending", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await getPendingBands(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({
            error:err.message
        })
    }
})
// Approve Band 
app.patch("/bands/:id/approve", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const bandId = req.params.id 
        if (typeof bandId !== "string") {
            return res.status(400).json({
                error:"Invalid booking ID."
            })
        }
        const result = await approveBand(bandId, req.user)
        return res.json({
            success:true,
            status:"approved"
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// Deny Band 
app.patch("/bands/:id/deny", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const bandId = req.params.id 
        if (typeof bandId !== "string") {
            return res.status(400).json({
                error:"Invalid booking ID."
            })
        }
        const result = await denyBand(bandId, req.user)
        return res.json({
            success:true,
            status:"denied"
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})

// Receive Booking 
app.post("/bookings", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await createBooking(req.body, req.user)
        return res.status(200).json({
            message:"Booking created.",
            booking:result
        })
    } catch(err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// View Bookings 
app.get("/bookings/pending", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await getPendingBookings(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({
            error:err.message
        })
    }
})
// View all school bookings intersecting a requested local calendar date.
app.get("/bookings/school", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const date = req.query.date
        if (typeof date !== "string") {
            return res.status(400).json({ error:"A date in YYYY-MM-DD format is required." })
        }
        const result = await getSchoolBookingsForDate(req.user, date)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({ error:err.message })
    }
})
// Approve Booking 
app.patch("/bookings/:id/approve", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const bookingId = req.params.id 
        if (typeof bookingId !== "string") {
            return res.status(400).json({
                error:"Invalid booking ID."
            })
        }
        const result = await approveBooking(bookingId, req.user)
        return res.json({
            success:true,
            status:"approved"
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// Deny Booking 
app.patch("/bookings/:id/deny", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const bookingId = req.params.id 
        if (typeof bookingId !== "string") {
            return res.status(400).json({
                error:"Invalid booking ID."
            })
        }
        const result = await denyBooking(bookingId, req.user)
        return res.json({
            success:true,
            status:"denied"
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})

// Receive new Room 
app.post("/rooms", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await createRoom(req.body, req.user)
        return res.status(200).json({
            message:"Room created.",
            newroom:result
        })
    } catch(err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// View Rooms 
app.get("/rooms", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await getRooms(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({
            error:err.message
        })
    }
})
// View weekly availability for a room
app.get("/rooms/:id/availability", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    try {
        const roomId = req.params.id
        if (typeof roomId !== "string") {
            return res.status(400).json({ error:"Invalid room ID." })
        }
        const result = await getRoomAvailability(roomId, req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({ error:err.message })
    }
})
// View a Single Room
app.get("/rooms/:id", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const roomId = req.params.id 
        if (typeof roomId !== "string") {
            return res.status(400).json({
                error:"Invalid room ID."
            })
        }
        const result = await getRoomSingle(roomId, req.user)
        return res.json(result)
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// View All Rooms that Meet Requirements
app.post("/rooms/req", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await getRoomWithRequirements(req.body, req.user)
        return res.json(result)
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// Edit Room
app.patch("/rooms/:id", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const roomId = req.params.id 
        if (typeof roomId !== "string") {
            return res.status(400).json({
                error:"Invalid room ID."
            })
        }
        const result = await editRoom(roomId, req.body, req.user)
        return res.json({
            success:true
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// Delete Room 
app.delete("/rooms/:id", authMiddleware, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const roomId = req.params.id 
        if (typeof roomId !== "string") {
            return res.status(400).json({
                error:"Invalid room ID."
            })
        }
        const result = await removeRoom(roomId, req.user)
        return res.json({
            success:true
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})

// Receive Sign-Up Request
app.post("/users", authTokenOnly, async (req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await createUser(req.body, req.user)
        return res.status(200).json({
            message:"User document created.",
            result:result
        })
    } catch(err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})
// View a student-safe, same-school roster for member selection
app.get("/students", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const result = await getSchoolStudents(req.user)
        return res.json(result)
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({
            error:err.message
        })
    }
})
app.get("/students/roster", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const result = await getStudentRoster(req.user)
        return res.json(result)
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({
            error:err.message
        })
    }
})
// View Users (Only of same school)
app.get("/users", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const result = await getUsers(req.user)
        return res.json(result)
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({
            error:err.message
        })
    }
})

app.post("/strikes", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const { userId, reason } = req.body
        if (typeof userId !== "string" || !userId.trim() || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ error:"userId and reason are required." })
        }

        const result = await issueStrike(userId, reason, req.user)
        return res.json(result)
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({ error:err.message })
    }
})

app.post("/bands/:id/strike", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const bandId = req.params.id
        const { reason } = req.body
        if (typeof bandId !== "string" || !bandId.trim()) {
            return res.status(400).json({ error:"Invalid band ID." })
        }
        if (typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ error:"A reason is required to issue a strike." })
        }

        const result = await issueBandStrike(bandId, reason, req.user)
        return res.json(result)
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({ error:err.message })
    }
})

app.get("/strikes/mine", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        if (typeof req.user.schoolId !== "string" || !req.user.schoolId.trim()) {
            return res.status(400).json({ error:"User is not assigned to a valid school." })
        }

        const result = await getStudentStrikeStatus(req.user.id, req.user.schoolId)
        return res.json(result)
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({ error:err.message })
    }
})
// View a specific user 
app.get("/users/:id", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
     // Failsafe 
    try {
        const userId = req.params.id 
        if (typeof userId !== "string") {
            return res.status(400).json({
                error:"Invalid user ID."
            })
        }
        const result = await getSpecificUser(userId, req.user)
        return res.json(result)
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})

// Edit user role / permissions
app.patch("users/:id", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    // Failsafe 
    try {
        const userId = req.params.id 
        if (typeof userId !== "string") {
            return res.status(400).json({
                error:"Invalid user ID."
            })
        }
        const result = await changeUserRole(userId, req.body, req.user)
        return res.json({
            success:true
        })
    } catch (err) {
        console.error(err)
        return res.status(400).json({
            error:err.message
        })
    }
})

// View bands for the authenticated user
app.get("/bands/mine", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const result = await getBandsForUser(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({
            error:err.message
        })
    }
})
// View active approved bands in the authenticated user's permitted scope
app.get("/bands/active", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const result = await getActiveBands(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({ error:err.message })
    }
})
// Disband an approved band
app.patch("/bands/:id/disband", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const bandId = req.params.id
        if (typeof bandId !== "string") {
            return res.status(400).json({ error:"Invalid band ID." })
        }
        const result = await disbandBand(bandId, req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({ error:err.message })
    }
})
// Leave an approved band as a student member
app.patch("/bands/:id/leave", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const bandId = req.params.id
        if (typeof bandId !== "string") {
            return res.status(400).json({ error:"Invalid band ID." })
        }
        const result = await leaveBand(bandId, req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({ error:err.message })
    }
})
// View bookings created by the authenticated user
app.get("/bookings/mine", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const result = await getUserBookings(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({
            error:err.message
        })
    }
})
// View the authoritative current building Rollcall for staff
app.get("/rollcall", authMiddleware, async(req:AuthenticatedRequest, res:Response) => {
    try {
        const result = await getRollcall(req.user)
        return res.json(result)
    } catch (err) {
        return res.status(400).json({ error:err.message })
    }
})

// Set our port 
const PORT = process.env.PORT || 3000

// Set listen to port 
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})