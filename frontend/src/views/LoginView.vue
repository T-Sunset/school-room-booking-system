<script setup lang="ts">
// loginView.vue 
import {ref} from "vue"
import { useRouter } from "vue-router";
import { login } from "../services/userService"

// Get Router 
const router = useRouter()

// Reactive Data 
const email = ref("")
const password = ref("")
const error = ref("")
const rememberMe = ref(true)

// Actually Login function 
async function try_login() {
    try {
        await login(rememberMe.value, email.value, password.value)
        router.push("/") // Change pages if applicable
    } catch (err) {
        error.value = "Login failed."
    }
}
</script>

<template>
    <!-- Login Box -->
     <div class="d-flex justify-content-center align-items-center vh-100">
        <div class="card shadow-sm" style="width: 18rem;">
            <div class="card-body p-4">
                <h5 class="card-title">Login</h5>
                <form @submit.prevent="try_login">
                    <!-- Email -->
                    <div class="row mb-3">
                        <label for="email" class="form-label">Email: </label>
                        <input v-model="email" type="email" class="form-control" id="email" placeholder="name@domain.com" required/>
                    </div>

                    <!-- Password -->
                    <div class="row mb-3">
                        <label for="password" class="form-label">Password: </label>
                        <input v-model="password" type="password" class="form-control" id="password" placeholder="Password" required/>
                    </div>

                    <!-- Remember Me -->
                    <div class="form-check mb-3 d-flex justify-content-center align-items-center">
                        <input id="rememberMe" type="checkbox" v-model="rememberMe" class="form-check-input me-2 mt-0">
                        <label for="rememberMe" class="form-check-label mb-0">Remember Me</label>
                    </div>

                    <!-- Errors -->
                     <div v-if="error" class="row alert alert-danger">
                        {{ error }}
                     </div>

                    <!-- Submit -->
                    <div class="row">
                        <button type="submit" class="btn btn-primary">Sign In</button>
                    </div>
                </form>
            </div>
            <div class="card-footer py-3">
                <small>Don't have an account? <a href="/signup">Sign Up</a>.</small>
            </div>
        </div>
     </div>
</template>