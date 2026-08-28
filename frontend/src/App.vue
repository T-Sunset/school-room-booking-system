<script setup lang="ts">
  // App.vue
  import { logout } from './services/userService';
  import { auth } from "./firebase"
  import { useRouter } from 'vue-router';
  import { onAuthStateChanged } from 'firebase/auth';
  import {ref, onMounted, onBeforeUnmount, nextTick, watch} from "vue"
  import { useAuthStore } from './stores/authStore';

  // Get router
  const router = useRouter()
  const authStore = useAuthStore()
  const menuOpen = ref(false)
  const menuToggle = ref<HTMLButtonElement | null>(null)
  const navContainer = ref<HTMLElement | null>(null)

  // Get whether or not we're logged in as a reactive variable
  const loggedIn = ref(false) // False by default

  // On Mounted / Start Function
  onMounted(() => {
    // Whenever our auth state is changed
    onAuthStateChanged(auth, (user) => {
      // Set loggedIn to whether or not we're logged in (whether 'user' exists in auth)
      loggedIn.value = !!user
    })
    window.addEventListener('keydown', handleMenuKeydown)
  })

  onBeforeUnmount(() => window.removeEventListener('keydown', handleMenuKeydown))

  // Try logout 
  async function try_logout() {
    try {
      await logout()
      router.push("/login")
    } catch (err) {
      console.log(err)
    }
  }

  function openMenu() {
    menuOpen.value = true
    nextTick(() => navContainer.value?.querySelector<HTMLElement>('a')?.focus())
  }

  function closeMenu() {
    menuOpen.value = false
    nextTick(() => menuToggle.value?.focus())
  }

  function toggleMenu() {
    menuOpen.value ? closeMenu() : openMenu()
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen.value) closeMenu()
  }

  watch(() => authStore.role, (role) => {
    if (role !== "admin") menuOpen.value = false
  })
</script>

<template>
  <div class="app-shell">
    <header class="app-mobile-header">
      <button
        ref="menuToggle"
        type="button"
        class="btn btn-outline-light app-menu-toggle"
        :aria-label="menuOpen ? 'Close navigation menu' : 'Open navigation menu'"
        :aria-expanded="menuOpen"
        aria-controls="app-navigation"
        @click="toggleMenu">
        <span class="app-menu-icon" aria-hidden="true">&#9776;</span>
        <span>Menu</span>
      </button>
      <span class="app-mobile-title">Room Booking Service</span>
    </header>

    <div v-if="menuOpen" class="app-nav-backdrop" aria-hidden="true" @click="closeMenu"></div>

    <aside id="app-navigation" class="app-sidebar" :class="{ 'is-open': menuOpen }" aria-label="Primary navigation">
      <div class="app-brand">
        <span class="app-brand-mark" aria-hidden="true"></span>
        <h1>Room Booking Service</h1>
      </div>

      <nav ref="navContainer" class="app-nav-links" aria-label="Main navigation" tabindex="-1">
        <router-link to="/" @click="closeMenu">Dashboard</router-link>
        <router-link to="/bookings" @click="closeMenu">Bookings</router-link>
        <router-link to="/bands" @click="closeMenu">Bands</router-link>
        <router-link to="/rooms" @click="closeMenu">Rooms</router-link>
        <router-link v-if="authStore.role === 'admin' || authStore.role === 'teacher'" to="/students" @click="closeMenu">Students</router-link>
        <router-link v-if="authStore.role === 'admin'" to="/admin" @click="closeMenu">Admin</router-link>
      </nav>

      <button v-if="loggedIn" type="button" class="btn btn-outline-light app-logout" @click="try_logout">Log out</button>
    </aside>

    <main class="app-main">
      <div class="container-fluid app-content">
      <router-view/>
      </div>
    </main>
  </div>
</template>
