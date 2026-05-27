import { createRouter, createWebHistory } from 'vue-router'
import ParkingView  from '../views/ParkingView.vue'
import ClientsView from '../views/ClientsView.vue'
import HistoryView from '../views/HistoryView.vue'
import LotsView from '../views/LotsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'parking',
      component: ParkingView
    },
    {
      path: '/clients',
      name: 'clients',
      component: ClientsView
    },
    {
  path: '/history',
  name: 'history',
  component: HistoryView
},
{
  path: '/lots',
  name: 'lots',
  component: LotsView
}
  ]
})

export default router
