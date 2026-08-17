<script setup lang="ts">
    // SignUpView.vue
    import {ref} from "vue"
    import { useRouter } from "vue-router";
    import { signUp } from "../services/userService";

    // Get Router
    const router = useRouter()

    // Reactive Data
    const email = ref("")
    const password = ref("")
    const passwordAgain = ref("")
    const yearLevel = ref(0)
    const error = ref("")

    // Sign Up
    async function try_signup() {
        try {
            if (password.value === passwordAgain.value) {
                await signUp(email.value, password.value, yearLevel.value)
                router.push("/") // Change pages if applicable
            }
            else throw new Error("Passwords do not match.")
        } catch (err) {
            error.value = "Sign-Up failed. Ensure your passwords match."
        }
    }
</script>

<template>
    <!-- Sign Up Box -->
     <div class="d-flex justify-content-center align-items-center vh-100">
        <div class="card shadow-sm" style="width: 18rem;">
            <div class="card-body p-4">
                <h5 class="card-title">Sign-Up</h5>
                <form @submit.prevent="try_signup">
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
                    <div class="row mb-3">
                        <label for="passwordAgain" class="form-label">Password Again: </label>
                        <input v-model="passwordAgain" type="password" class="form-control" id="passwordAgain" placeholder="Password Again" required/>
                    </div>

                    <!-- Year Level -->
                    <div class="row mb-3">
                        <label for="yearLevel" class="form-label">Year Level: </label>
                        <input v-model.number="yearLevel" type="number" class="form-control" id="yearLevel" placeholder="Year Level 7-12" min="7" max="12" required/>
                    </div>

                    <!-- Errors -->
                     <div v-if="error" class="row alert alert-danger">
                        {{ error }}
                     </div>

                    <!-- Submit -->
                    <div class="row">
                        <button type="submit" class="btn btn-primary">Sign Up!</button>
                    </div>
                </form>
            </div>
        </div>
     </div>
</template>