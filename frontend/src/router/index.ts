// index.ts 
import { createRouter, createWebHistory } from "vue-router";
import { auth } from "../firebase";
import { waitForAuth } from "../services/userService.ts";
import { useAuthStore } from "../stores/authStore";

// Import Pages 
import DashboardView from "../views/DashboardView.vue";
import RoomsView from "../views/RoomsView.vue";
import AdminView from "../views/AdminView.vue";
import LoginView from "../views/LoginView.vue";
import SignUpView from "../views/SignUpView.vue";
import OneRoomView from "../views/OneRoomView.vue";
import BookingsView from "../views/BookingsView.vue";
import BandsView from "../views/BandsView.vue";
import StudentsView from "../views/StudentsView.vue";

// Create Routes 
const routes = [
    { path: '/', component:DashboardView, meta: { requiresAuth:true } },
    { path: '/login', component:LoginView },
    { path: '/signup', component:SignUpView},
    { path: '/rooms', component:RoomsView , meta: { requiresAuth:true } },
    { path: '/admin', component:AdminView , meta: { requiresAuth:true, requiresAdmin:true } },
    {path: '/rooms/:id', component:OneRoomView, meta: {requiresAuth:true } },
    { path: '/bookings', component:BookingsView, meta: {requiresAuth:true} },
    { path: '/bands', component:BandsView, meta: {requiresAuth:true} },
    { path: '/students', component:StudentsView, meta: {requiresAuth:true, requiresStudentManagement:true} }
]

// Create Router 
const router = createRouter({
    history: createWebHistory(),
    routes
})

// Guard against unauthorised page access
router.beforeEach(async (to) => {
    // Wait for Firebase once
    await waitForAuth()

    // Get our current user 
    const user = auth.currentUser
    const authStore = useAuthStore()

    // Does the page we're trying to view require authentication?
    if (to.meta.requiresAuth && !user) {
        return ("/login")
    } else if (to.meta.requiresStudentManagement && authStore.role !== "teacher" && authStore.role !== "admin") {
        return ("/")
    } else if (to.meta.requiresAdmin && authStore.role !== "admin") {
        return ("/")
    } else {
        return
    }
})


// Make final router public 
export default router