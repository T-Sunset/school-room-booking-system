import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'

// Bootstrap -- Style & Arrangement 
import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'
import 'bootstrap'

// Pinia -- State Management between Components 
import { createPinia } from 'pinia'
import { hydrateCurrentUser } from './services/userService'

// Page routing 
import router from './router'

// Create the Vue app
const app = createApp(App)

// Restore the user profile before mounting role-dependent pages.
const pinia = createPinia()
app.use(pinia)

async function startApp() {
	await hydrateCurrentUser()
	app.use(router)
	app.mount('#app')
}

startApp()
