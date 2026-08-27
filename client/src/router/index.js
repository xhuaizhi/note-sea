import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/', name: 'Home', component: () => import('../views/Home.vue'), meta: { auth: true } },
  { path: '/note/:id', name: 'Note', component: () => import('../views/NoteEditor.vue'), meta: { auth: true } },
  { path: '/view/:id', name: 'HtmlView', component: () => import('../views/HtmlView.vue'), meta: { auth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  if (to.meta.auth) {
    const auth = useAuthStore();
    if (!auth.token) return '/login';
  }
});

export default router;
