<script setup lang="ts">
    // DashboardView.vue
    import {ref, onMounted, computed} from 'vue'
    import type { BookingRequest } from '../types/Booking'
    import { getStartOfWeek } from '../types/Booking'
    import type { Room } from '../types/Room'
    import { getRooms } from '../services/roomService'
    import { getBookings, getRollcall, getSchoolBookingsForDate, getTodayAttendance, updateAttendance } from '../services/bookingService'
    import { getBandsForUser, getSameSchoolStudents } from '../services/bandService'
    import type { Band } from '../types/Band'
    import type { AttendanceUpdateStatus, RollcallEntry } from '../types/Booking'
    import BandCard from '../components/BandCard.vue'
    import { useAuthStore } from '../stores/authStore'

    const authStore = useAuthStore()
    const isStaff = authStore.role === 'teacher' || authStore.role === 'admin'
    const dashboardLoading = ref(true)
    const dashboardError = ref("")

    // Role-specific Dashboard data
    const bookings = ref<BookingRequest[]>([])
    const bands = ref<Band[]>([])
    const memberNames = ref<Record<string, string>>({})
    const rollcallEntries = ref<RollcallEntry[]>([])
    const todayAttendanceEntries = ref<RollcallEntry[]>([])
    const rooms = ref<Room[]>([])

    const myBookingsThisWeek = computed(() => {
        const startOfWeek = getStartOfWeek()
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 7)

        return bookings.value.filter(booking => {
            const start = new Date(booking.startTime)
            const end = new Date(booking.endTime)
            return start < endOfWeek && end > startOfWeek
        }).sort((first, second) => new Date(first.startTime).getTime() - new Date(second.startTime).getTime())
    })

    const pastBookingsThisWeek = computed(() => myBookingsThisWeek.value.filter(booking => new Date(booking.endTime) <= new Date()))
    const upcomingBookingsThisWeek = computed(() => myBookingsThisWeek.value.filter(booking => new Date(booking.endTime) > new Date()))
    const activeBands = computed(() => bands.value.filter(band => band.status === "approved"))
    const pendingBands = computed(() => bands.value.filter(band => band.status === "pending"))
    const availableRoomCount = computed(() => {
        const now = new Date()
        return rooms.value.filter(room => {
            const minutes = now.getHours() * 60 + now.getMinutes()
            const isWithinHours = minutes >= room.rules.openHour * 60 && minutes < room.rules.closeHour * 60
            const isAllowedDay = room.rules.allowedDays.includes(now.getDay())
            return room.isBookable && !room.isInUse && isWithinHours && isAllowedDay
        }).length
    })
    const staffRollcallLoading = ref(false)
    const staffAttendanceLoading = ref(false)
    const staffBookingsLoading = ref(false)
    const staffRollcallError = ref("")
    const staffAttendanceError = ref("")
    const staffBookingsError = ref("")
    const rollcallLastUpdated = ref("")
    const attendanceLastUpdated = ref("")
    const attendanceSaving = ref<Record<string, boolean>>({})
    const attendanceFeedback = ref<Record<string, { type: "success" | "danger", message: string }>>({})
    const todaysBookings = computed(() => {
        return [...bookings.value].sort((first, second) =>
            new Date(first.startTime).getTime() - new Date(second.startTime).getTime())
    })
    const todaysAttendance = computed(() => {
        return [...todayAttendanceEntries.value].sort((first, second) =>
            new Date(first.startTime).getTime() - new Date(second.startTime).getTime() ||
            first.bookingId.localeCompare(second.bookingId) ||
            first.studentId.localeCompare(second.studentId))
    })

    function getLocalDateString(date: Date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    function getAttendanceKey(entry: RollcallEntry) {
        return `${entry.bookingId}:${entry.studentId}`
    }

    async function setAttendance(entry: RollcallEntry, status: AttendanceUpdateStatus) {
        const key = getAttendanceKey(entry)
        if (attendanceSaving.value[key]) return

        attendanceSaving.value = { ...attendanceSaving.value, [key]: true }
        const feedback = { ...attendanceFeedback.value }
        delete feedback[key]
        attendanceFeedback.value = feedback

        try {
            const savedAttendance = await updateAttendance(entry.bookingId, entry.studentId, { status })
            entry.attendanceStatus = savedAttendance.status
            entry.attendanceUpdatedBy = savedAttendance.updatedBy
            entry.attendanceUpdatedAt = savedAttendance.updatedAt
            attendanceFeedback.value = {
                ...attendanceFeedback.value,
                [key]: { type: "success", message: "Attendance saved." }
            }
        } catch (err:any) {
            attendanceFeedback.value = {
                ...attendanceFeedback.value,
                [key]: { type: "danger", message: err.response?.data?.error || err.message || "Unable to save attendance." }
            }
        } finally {
            const saving = { ...attendanceSaving.value }
            delete saving[key]
            attendanceSaving.value = saving
        }
    }

    async function refreshRollcall() {
        if (!isStaff) return
        staffRollcallLoading.value = true
        staffRollcallError.value = ""
        try {
            rollcallEntries.value = await getRollcall()
            rollcallLastUpdated.value = new Date().toLocaleString()
        } catch (err:any) {
            staffRollcallError.value = err.response?.data?.error || err.message || "Unable to load Rollcall."
        } finally {
            staffRollcallLoading.value = false
        }
    }

    async function refreshTodayAttendance() {
        if (!isStaff) return
        staffAttendanceLoading.value = true
        staffAttendanceError.value = ""
        try {
            todayAttendanceEntries.value = await getTodayAttendance()
            attendanceLastUpdated.value = new Date().toLocaleString()
        } catch (err:any) {
            staffAttendanceError.value = err.response?.data?.error || err.message || "Unable to load today's attendance."
        } finally {
            staffAttendanceLoading.value = false
        }
    }

    onMounted(async () => {
        dashboardLoading.value = true
        dashboardError.value = ""
        bookings.value = []
        bands.value = []
        memberNames.value = {}
        rollcallEntries.value = []
        todayAttendanceEntries.value = []
        rooms.value = []
        attendanceSaving.value = {}
        attendanceFeedback.value = {}
        staffRollcallError.value = ""
        staffAttendanceError.value = ""
        staffBookingsError.value = ""
        rollcallLastUpdated.value = ""
        attendanceLastUpdated.value = ""

        try {
            if (authStore.role === "student") {
                const results = await Promise.allSettled([
                    getRooms(),
                    getBookings(),
                    getBandsForUser(),
                    getSameSchoolStudents()
                ])
                const [roomsResult, bookingsResult, bandsResult, studentsResult] = results
                if (roomsResult.status === "fulfilled") rooms.value = roomsResult.value as Room[]
                if (bookingsResult.status === "fulfilled") bookings.value = bookingsResult.value
                if (bandsResult.status === "fulfilled") bands.value = bandsResult.value
                if (studentsResult.status === "fulfilled") {
                    memberNames.value = Object.fromEntries(studentsResult.value.map(student => [student.id, student.email]))
                    memberNames.value[authStore.uid] = authStore.email
                }
                const failedSources = results
                    .map((result, index) => result.status === "rejected" ? ["rooms", "bookings", "bands", "students"][index] : null)
                    .filter((source): source is string => source !== null)
                if (failedSources.length > 0) {
                    dashboardError.value = `Unable to load ${failedSources.join(", ")} data.`
                }
            } else if (isStaff) {
                staffRollcallLoading.value = true
                staffAttendanceLoading.value = true
                staffBookingsLoading.value = true
                const [roomsResult, rollcallResult, bookingsResult, attendanceResult] = await Promise.allSettled([
                    getRooms(),
                    getRollcall(),
                    getSchoolBookingsForDate(getLocalDateString(new Date())),
                    getTodayAttendance()
                ])
                if (roomsResult.status === "fulfilled") rooms.value = roomsResult.value as Room[]
                if (rollcallResult.status === "fulfilled") {
                    rollcallEntries.value = rollcallResult.value
                    rollcallLastUpdated.value = new Date().toLocaleString()
                } else {
                    staffRollcallError.value = "Unable to load Rollcall."
                }
                staffRollcallLoading.value = false
                if (bookingsResult.status === "fulfilled") {
                    bookings.value = bookingsResult.value
                } else {
                    staffBookingsError.value = "Unable to load today's bookings."
                }
                staffBookingsLoading.value = false
                if (attendanceResult.status === "fulfilled") {
                    todayAttendanceEntries.value = attendanceResult.value
                    attendanceLastUpdated.value = new Date().toLocaleString()
                } else {
                    staffAttendanceError.value = "Unable to load today's attendance."
                }
                staffAttendanceLoading.value = false
            }
        } catch (err:any) {
            dashboardError.value = err.response?.data?.error || err.message || "Unable to load Dashboard data."
        } finally {
            dashboardLoading.value = false
        }
    })
</script>

<template>
    <div>
        <h1 class="mb-4">Dashboard</h1>

        <div v-if="authStore.role === 'student' && authStore.strikeStatus.isBanned" class="alert alert-danger" role="alert">
            You are currently banned from making new bookings until {{ new Date(authStore.strikeStatus.banExpiresAt as string).toLocaleString() }}.
        </div>
        <div v-else-if="authStore.role === 'student' && authStore.strikeStatus.hasWarning" class="alert alert-warning" role="alert">
            You have received a strike. This is currently a warning; you are not banned from making bookings.
        </div>
        <div v-if="dashboardError" class="alert alert-danger" role="alert">{{ dashboardError }}</div>
        <div v-else-if="dashboardLoading" class="loading-state mb-4" role="status">Loading Dashboard data...</div>

        <div v-if="authStore.role === 'student'" class="row g-3 mb-4">
            <div class="col-md-4">
                <div class="card p-3 text-center">
                    <h5>Rooms Available Now</h5>
                    <p class="display-6">{{ availableRoomCount }}</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-3 text-center">
                    <h5>This Week's Bookings</h5>
                    <p class="display-6">{{ myBookingsThisWeek.length }}</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-3 text-center">
                    <h5>My Active Bands</h5>
                    <p class="display-6">{{ activeBands.length }}</p>
                </div>
            </div>
        </div>

        <div v-if="authStore.role === 'student'" class="row g-4">
            <section class="col-12">
                <div class="card p-3">
                    <h4 class="section-heading">This Week's Bookings</h4>
                    <div v-if="myBookingsThisWeek.length === 0" class="empty-state">No bookings this week.</div>
                    <div v-else class="table-responsive">
                        <table class="table table-striped table-sm data-table mb-0">
                            <thead>
                                <tr><th>Date</th><th>Room</th><th>Band</th><th>Start</th><th>End</th><th>Timing</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="booking in myBookingsThisWeek" :key="booking.id">
                                    <td>{{ new Date(booking.startTime).toLocaleDateString() }}</td>
                                    <td>{{ booking.roomName || "Room unavailable" }}</td>
                                    <td>{{ booking.type === "band" ? (booking.bandName || "Band unavailable") : "-" }}</td>
                                    <td>{{ new Date(booking.startTime).toLocaleTimeString() }}</td>
                                    <td>{{ new Date(booking.endTime).toLocaleTimeString() }}</td>
                                    <td>{{ new Date(booking.endTime) <= new Date() ? "Past" : "Upcoming" }}</td>
                                    <td class="text-capitalize">{{ booking.status }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="small text-muted mt-2">Past: {{ pastBookingsThisWeek.length }} | Upcoming: {{ upcomingBookingsThisWeek.length }}</div>
                </div>
            </section>

            <section class="col-12">
                <h4 class="mb-3">My Bands</h4>
                <div v-if="activeBands.length === 0 && pendingBands.length === 0" class="card p-3 text-muted">You are not currently in any bands.</div>
                <template v-else>
                    <div v-if="activeBands.length > 0" class="row g-3">
                            <div v-for="band in activeBands" :key="band.id" class="col-md-6 col-xl-4">
                                <BandCard :band="band" :member-names="memberNames" />
                        </div>
                    </div>
                    <div v-if="pendingBands.length > 0" class="mt-4">
                        <h5>Pending Bands</h5>
                        <div class="row g-3">
                            <div v-for="band in pendingBands" :key="band.id" class="col-md-6 col-xl-4">
                                <BandCard :band="band" :member-names="memberNames" />
                            </div>
                        </div>
                    </div>
                </template>
            </section>
        </div>

        <div v-if="isStaff" class="row g-4">
            <section class="col-12">
                <div class="section-header">
                    <h2 class="h4 mb-0">Today's Bookings</h2>
                </div>
                <div v-if="staffBookingsError" class="alert alert-danger" role="alert">{{ staffBookingsError }}</div>
                <div v-else-if="staffBookingsLoading" class="loading-state" role="status">Loading today's bookings...</div>
                <div v-else-if="todaysBookings.length === 0" class="empty-state">No bookings today.</div>
                <div v-else class="card data-card table-responsive">
                    <table class="table table-striped table-sm data-table align-middle mb-0">
                        <thead>
                            <tr><th>Time</th><th>Room</th><th>Student / Requester</th><th>Band</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="booking in todaysBookings" :key="booking.id">
                                <td>{{ new Date(booking.startTime).toLocaleTimeString() }} - {{ new Date(booking.endTime).toLocaleTimeString() }}</td>
                                <td>{{ booking.roomName || "Room unavailable" }}</td>
                                <td>{{ booking.requesterEmail || "Student unavailable" }}</td>
                                <td>{{ booking.type === "band" ? (booking.bandName || "Band unavailable") : "-" }}</td>
                                <td>
                                    <span class="status-badge" :class="booking.status === 'approved' ? 'status-approved' : booking.status === 'cancelled' || booking.status === 'denied' ? 'status-danger' : 'status-warning'">
                                        {{ booking.status }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="col-12 col-xl-6">
                <div class="section-header">
                    <h2 class="h4 mb-0">Students In the Building:</h2>
                    <button class="btn btn-primary" :disabled="staffRollcallLoading" @click="refreshRollcall">Refresh</button>
                </div>
                <p v-if="rollcallLastUpdated" class="text-muted">Last updated: {{ rollcallLastUpdated }}</p>
                <div v-if="staffRollcallError" class="alert alert-danger">{{ staffRollcallError }}</div>
                <div v-else-if="staffRollcallLoading" class="loading-state" role="status">Loading Rollcall...</div>
                <div v-else-if="rollcallEntries.length === 0" class="empty-state">No students are currently recorded as being allowed in the building.</div>
                <div v-else class="card data-card table-responsive">
                    <table class="table table-striped table-sm data-table align-middle mb-0">
                        <thead>
                            <tr><th>Student</th><th>Room</th><th>Band</th><th>Start</th><th>End</th><th>Attendance</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in rollcallEntries" :key="`${entry.bookingId}-${entry.studentId}`">
                                <td>{{ entry.studentEmail }}</td>
                                <td>{{ entry.roomName }}</td>
                                <td>{{ entry.bandName || '-' }}</td>
                                <td>{{ new Date(entry.startTime).toLocaleTimeString() }}</td>
                                <td>{{ new Date(entry.endTime).toLocaleTimeString() }}</td>
                                <td>
                                    <span class="status-badge mb-2" :class="entry.attendanceStatus === 'present' ? 'status-present' : entry.attendanceStatus === 'absent' ? 'status-absent' : 'status-unmarked'">
                                        {{ entry.attendanceStatus === 'unmarked' ? 'Unmarked' : entry.attendanceStatus === 'present' ? 'Present' : 'Absent' }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="col-12 col-xl-6">
                <div class="section-header">
                    <h2 class="h4 mb-0">Today's Attendance</h2>
                    <button class="btn btn-primary" :disabled="staffAttendanceLoading" @click="refreshTodayAttendance">Refresh</button>
                </div>
                <p v-if="attendanceLastUpdated" class="text-muted">Last updated: {{ attendanceLastUpdated }}</p>
                <div v-if="staffAttendanceError" class="alert alert-danger">{{ staffAttendanceError }}</div>
                <div v-else-if="staffAttendanceLoading" class="loading-state" role="status">Loading today's attendance...</div>
                <div v-else-if="todaysAttendance.length === 0" class="empty-state">No attendance entries for today.</div>
                <div v-else class="card data-card table-responsive">
                    <table class="table table-striped table-sm data-table align-middle mb-0">
                        <thead>
                            <tr><th>Student</th><th>Room</th><th>Band</th><th>Start</th><th>End</th><th>Attendance</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in todaysAttendance" :key="`${entry.bookingId}-${entry.studentId}`">
                                <td>{{ entry.studentEmail }}</td>
                                <td>{{ entry.roomName }}</td>
                                <td>{{ entry.bandName || '-' }}</td>
                                <td>{{ new Date(entry.startTime).toLocaleTimeString() }}</td>
                                <td>{{ new Date(entry.endTime).toLocaleTimeString() }}</td>
                                <td>
                                    <span class="status-badge mb-2" :class="entry.attendanceStatus === 'present' ? 'status-present' : entry.attendanceStatus === 'absent' ? 'status-absent' : 'status-unmarked'">
                                        {{ entry.attendanceStatus === 'unmarked' ? 'Unmarked' : entry.attendanceStatus === 'present' ? 'Present' : 'Absent' }}
                                    </span>
                                    <div class="btn-group d-flex" role="group" :aria-label="`Attendance controls for ${entry.studentEmail}`">
                                        <button
                                            type="button"
                                            class="btn btn-sm"
                                            :class="entry.attendanceStatus === 'present' ? 'btn-success' : 'btn-outline-success'"
                                            :disabled="attendanceSaving[getAttendanceKey(entry)]"
                                            :aria-pressed="entry.attendanceStatus === 'present'"
                                            @click="setAttendance(entry, 'present')">
                                            Present
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-sm"
                                            :class="entry.attendanceStatus === 'absent' ? 'btn-danger' : 'btn-outline-danger'"
                                            :disabled="attendanceSaving[getAttendanceKey(entry)]"
                                            :aria-pressed="entry.attendanceStatus === 'absent'"
                                            @click="setAttendance(entry, 'absent')">
                                            Absent
                                        </button>
                                    </div>
                                    <div v-if="attendanceSaving[getAttendanceKey(entry)]" class="small text-muted mt-1">Saving...</div>
                                    <div v-else-if="attendanceFeedback[getAttendanceKey(entry)]" class="small mt-1" :class="`text-${attendanceFeedback[getAttendanceKey(entry)].type}`">
                                        {{ attendanceFeedback[getAttendanceKey(entry)].message }}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </div>
</template>