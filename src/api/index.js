import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

export default {
  get(url) {
  return api.get(url)
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
  }

}