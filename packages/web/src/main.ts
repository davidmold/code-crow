import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Configure Monaco Editor workers for Vite
import './monaco-worker'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')