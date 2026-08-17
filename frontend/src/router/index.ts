// index.ts 
import { createRouter, createWebHistory } from "vue-router";
import { auth } from "../firebase";
import { waitForAuth } from "../services/userService.ts";

// Import Pages 
import DashboardView from "../views/DashboardView.vue";
import RoomsView from "../views/RoomsView.vue";
import AdminView from "../views/AdminView.vue";
import LoginView from "../views/LoginView.vue";
import SignUpView from "../views/SignUpView.vue";
import OneRoomView from "../views/OneRoomView.vue";
import BookingsView from "../views/BookingsView.vue";

// Create Routes 
const routes = [
    { path: '/', component:DashboardView, meta: { requiresAuth:true } },
    { path: '/login', component:LoginView },
    { path: '/signup', component:SignUpView},
    { path: '/rooms', component:RoomsView , meta: { requiresAuth:true } },
    { path: '/admin', component:AdminView , meta: { requiresAuth:true } },
    {path: '/rooms/:id', component:OneRoomView, meta: {requiresAuth:true } },
    { path: '/bookings', component:BookingsView, meta: {requiresAuth:true} }
]

// Create Router 
const router = createRouter({
    history: createWebHistory(),
    routes
})

// Guard against unauthorised page access
router.beforeEach(async (to,from) => {
    // Wait for Firebase once
    await waitForAuth()

    // Get our current user 
    const user = auth.currentUser

    // Does the page we're trying to view require authentication?
    if (to.meta.requiresAuth && !user) {
        return ("/login")
    } else {
        return
    }
})


// Make final router public 
export default router