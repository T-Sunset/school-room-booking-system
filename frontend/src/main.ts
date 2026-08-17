import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'

// Bootstrap -- Style & Arrangement 
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

// Pinia -- State Management between Components 
import { createPinia } from 'pinia'

// Page routing 
import router from './router'

// Create the Vue app
const app = createApp(App)

// Apply Pinia & Router 
app.use(createPinia())
app.use(router)

// Mount that bad boi
app.mount('#app')
