import { createRouter, createWebHashHistory } from 'vue-router'

// 页面地址表：网址 → 页面文件。以后加新页面，在这里登记一行即可
const routes = [
  { path: '/', redirect: '/home' },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/home/index.vue'),
    meta: { title: '今天穿什么' },
  },
  {
    path: '/wardrobe',
    name: 'wardrobe',
    component: () => import('../views/wardrobe/index.vue'),
    meta: { title: '我的衣柜' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/profile/index.vue'),
    meta: { title: '我的' },
  },
]

const router = createRouter({
  // hash 模式：网址带 # 号（如 /#/wardrobe），部署到任何静态服务器都不会 404
  history: createWebHashHistory(),
  routes,
})

export default router
