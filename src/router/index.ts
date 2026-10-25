import { createRouter, createWebHashHistory } from 'vue-router'
export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('@/views/WorkspaceView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
