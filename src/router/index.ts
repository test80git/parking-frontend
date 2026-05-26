import { createRouter, createWebHistory } from 'vue-router'
import ParkingView  from '../views/ParkingView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'parking',
      component: ParkingView
    }
  ]
})

export default router
