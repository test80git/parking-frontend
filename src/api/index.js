import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

export default {
  get(url) {
    return api.get(url)
  },
  delete(url) {
    return api.delete(url)
  },
  // Стоянки
  getLots() {
    return api.get('/lots')
  },

  // Места на стоянке
  getSpots(lotId) {
    return api.get(`/lots/${lotId}/spots`)
  },

  // Активные сессии
  getSessions(lotId) {
    return api.get(`/lots/${lotId}/sessions`)
  },

  // Стоянки
  createLot(data) {
    return api.post('/lots', data)
  },
  updateLot(id, data) {
    return api.put(`/lots/${id}`, data)
  },
  deleteLot(id) {
    return api.delete(`/lots/${id}`)
  },
  setCurrentLot(id) {
    return api.put(`/lots/${id}/set-current`)
  },

  // Создать сессию
  createSession(data) {
    return api.post('/sessions', data)
  },

  // Оплатить сессию
  paySession(sessionId) {
    return api.put('/sessions/pay', { sessionId })
  },

  // Освободить место
  deleteSession(sessionId) {
    return api.delete(`/sessions/${sessionId}`)
  },

  // Машины
  getCars() {
    return api.get('/cars')
  },
  createCar(data) {
    return api.post('/cars', data)
  },
  updateCar(id, data) {
    return api.put(`/cars/${id}`, data)
  },
  deleteCar(id) {
    return api.delete(`/cars/${id}`)
  },

  // Владельцы
  getOwners() {
    return api.get('/owners')
  },

  // Поиск владельцев
  searchOwners(query) {
    return api.get(`/owners/search?query=${query}`)
  },

  put(url, data) {
    return api.put(url, data)
  },

  // Если нужно обновление сессии
  updateSession(sessionId, data) {
    return api.put(`/sessions/${sessionId}`, data)
  },

  filterSessions(data) {
    return api.post('/reports/sessions', data)
  },

  getSessionBySpotId(spotId) {
    return api.get(`/spots/${spotId}/sessions`)
  },

  // Клиенты
  getClients() {
    return api.get('/clients')
  },
  createClient(data) {
    return api.post('/clients', data)
  },
  updateClient(id, data) {
    return api.put(`/clients/${id}`, data)
  },
  deleteClient(id) {
    return api.delete(`/clients/${id}`)
  }

}