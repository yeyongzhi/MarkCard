import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import 'vue-sonner/style.css'
import './style.css'
import './styles/cards.css'
import App from './App.vue'
createApp(App).use(createPinia()).use(router).mount('#app')
