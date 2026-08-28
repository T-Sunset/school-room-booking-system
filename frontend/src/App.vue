<script setup lang="ts">
  // App.vue
  import { logout } from './services/userService';
  import { auth } from "./firebase"
  import { useRouter } from 'vue-router';
  import { onAuthStateChanged } from 'firebase/auth';
  import {ref, onMounted} from "vue"
  import { useAuthStore } from './stores/authStore';

  // Get router
  const router = useRouter()
  const authStore = useAuthStore()

  // Get whether or not we're logged in as a reactive variable
  const loggedIn = ref(false) // False by default

  // On Mounted / Start Function
  onMounted(() => {
    // Whenever our auth state is changed
    onAuthStateChanged(auth, (user) => {
      // Set loggedIn to whether or not we're logged in (whether 'user' exists in auth)
      loggedIn.value = !!user
    })
  })

  // Try logout 
  async function try_logout() {
    try {
      await logout()
      router.push("/login")
    } catch (err) {
      console.log(err)
    }
  }
</script>

<template>
  <div class="d-flex">
    <aside class="bg-dark text-white p-3 vh-100" style="width:240px;">
      <h4>Room Booking Service</h4>

      <router-link to="/" class="d-block text-white mb-2">Dashboard</router-link>
      <router-link to="/bookings" class="d-block text-white mb-2">Bookings</router-link>
      <router-link to="/bands" class="d-block text-white mb-2">Bands</router-link>
      <router-link to="/rooms" class="d-block text-white mb-2">Rooms</router-link>
      <router-link to="/students" class="d-block text-white mb-2" v-if="authStore.role === 'admin' || authStore.role === 'teacher'">Students</router-link>
      <router-link to="/admin" class="d-block text-white mb-2" v-if="authStore.role === 'admin'">Admin</router-link>
      <button @click="try_logout" v-if="loggedIn">Logout</button>
    </aside>

    <main class="flex-grow-1 p-4">
      <router-view/>
    </main>
  </div>
</template>
