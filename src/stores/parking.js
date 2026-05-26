import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useParkingStore = defineStore('parking', () => {
  // Состояние
  const parkingSpots = ref([])
  const cars = ref([])
  const owners = ref([])
  const loading = ref(false)
  const currentLotId = ref(1)
  
  // Создание мест (5x5)
  const createDefaultSpots = () => {
    const spots = []
    const rows = ['A', 'B', 'C', 'D', 'E']
    for (let i = 0; i < rows.length; i++) {
      for (let j = 1; j <= 5; j++) {
        spots.push({
          id: i * 5 + j,
          number: `${rows[i]}${j}`,
          status: 'free',
          carBrand: '',
          carNumber: '',
          bookingName: '',
          phone: '',
          dateTimeIn: '',
          dateTimeOut: '',
          isPaid: false,
          activeSessionId: null
        })
      }
    }
    return spots
  }
  
  // Загрузка с бэкенда
  const loadSpots = async () => {
    loading.value = true
    try {
      console.log('=== ЗАГРУЗКА ДАННЫХ ===')

      const [spotsRes, sessionsRes] = await Promise.all([
        api.getSpots(currentLotId.value),
        api.getSessions(currentLotId.value)
      ])
      
      console.log('Места из БД:', spotsRes.data)
      console.log('Сессии из БД:', sessionsRes.data)

      // Создаём массив мест с данными из сессий
      const spots = spotsRes.data.map(spot => {
        const session = sessionsRes.data.find(s => s.spotId === spot.id)

        console.log(`Обработка места ${spot.spotNumber}:`, {
          spotStatusИзБД: spot.status,
          sessionНайдена: !!session,
          sessionStatus: session?.status
        })

        return {
          id: spot.id,
          number: spot.spotNumber,
          status: session ? session.status : spot.status,
          carBrand: session?.carBrand || '',
          carNumber: session?.carNumber || '',
          bookingName: session?.ownerName || '',
          phone: session?.phone || '',
          dateTimeIn: session?.startTime?.slice(0, 16) || '',
          dateTimeOut: session?.endTime?.slice(0, 16) || '',
          isPaid: session?.isPaid || false,
          activeSessionId: session?.id || null
        }
      }).sort((a, b) => {
  // Сортировка по номеру места (A1, A2, B1, B2...)
  const numA = parseInt(a.number.match(/\d+/)[0])
  const numB = parseInt(b.number.match(/\d+/)[0])
  const letterA = a.number.match(/[A-Z]/)[0]
  const letterB = b.number.match(/[A-Z]/)[0]
  if (letterA === letterB) return numA - numB
  return letterA.localeCompare(letterB)
})
      
      console.log('Итоговые места после маппинга:', spots)

      parkingSpots.value = spots
      localStorage.setItem('parkingSpots', JSON.stringify(spots))
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      // Резерв: берём из localStorage
      const saved = localStorage.getItem('parkingSpots')
      if (saved) {
        parkingSpots.value = JSON.parse(saved)
      } else {
        parkingSpots.value = createDefaultSpots()
      }
    } finally {
      loading.value = false
    }
  }
  
  // Сохранение сессии
  const saveSession = async (spot) => {
    console.log('=== СОХРАНЕНИЕ СЕССИИ ===')
    console.log('Сохраняемый спот:', spot)

    if ((spot.status === 'occupied' || spot.status === 'booked') && spot.carNumber) {
          // Расчёт суммы
      const calculatePrice = (start, end) => {
        if (!start || !end) return 0
        const startDate = new Date(start)
        const endDate = new Date(end)
        const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
        const price = days * 100
        console.log('Расчёт:', { start, end, days, price })
        return price
      }

      const sessionData = {
        spotId: spot.id,
        carNumber: spot.carNumber,
        carBrand: spot.carBrand,
        ownerName: spot.bookingName,
        phone: spot.phone,
        startTime: spot.dateTimeIn,
        endTime: spot.dateTimeOut,
        totalPrice: calculatePrice(spot.dateTimeIn, spot.dateTimeOut),
        isPaid: spot.isPaid,
        status: spot.status
      }
      
      console.log('Отправка на бэкенд:', sessionData)

      try {
        if (spot.activeSessionId) {
          // Обновление существующей сессии
          await api.put(`/sessions/${spot.activeSessionId}`, sessionData)
        } else {
          // Создание новой сессии
          const response = await api.createSession(sessionData)
          spot.activeSessionId = response.data.id
        }
      } catch (error) {
        console.error('Ошибка сохранения:', error)
        throw error
        }
      } else if (spot.status === 'free' && spot.activeSessionId) {
       // Освобождение места
       await api.deleteSession(spot.activeSessionId)
       spot.activeSessionId = null
       spot.carBrand = ''
       spot.carNumber = ''
       spot.bookingName = ''
       spot.phone = ''
       spot.dateTimeIn = ''
       spot.dateTimeOut = ''
       spot.isPaid = false
      }
    
    // Обновляем локальное состояние
    const index = parkingSpots.value.findIndex(s => s.id === spot.id)
    if (index !== -1) {
          parkingSpots.value[index] = { 
          ...parkingSpots.value[index],  // сохраняем существующие поля
          ...spot,  // перезаписываем новыми значениями
          status: spot.status  // явно указываем статус
    }
    }
    
    localStorage.setItem('parkingSpots', JSON.stringify(parkingSpots.value))
  }
  
  // Загрузка машин и владельцев
  const loadCarsAndOwners = async () => {
    try {
      const [carsRes, ownersRes] = await Promise.all([
        api.getCars(),
        api.getOwners()
      ])
      cars.value = carsRes.data
      owners.value = ownersRes.data
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error)
    }
  }

  const paySession = async (sessionId) => {
  try {
    await api.paySession(sessionId)
    return true
    } catch (error) {
      console.error('Ошибка оплаты:', error)
      throw error
    }
  }

  const deleteSession = async (sessionId) => {
  console.log('deleteSession вызван, ID:', sessionId)
  try {
    await api.deleteSession(sessionId)
    // Обновить локальные данные
    const index = parkingSpots.value.findIndex(s => s.activeSessionId === sessionId)
    if (index !== -1) {
      parkingSpots.value[index] = {
        ...parkingSpots.value[index],
        status: 'free',
        carBrand: '',
        carNumber: '',
        bookingName: '',
        phone: '',
        dateTimeIn: '',
        dateTimeOut: '',
        isPaid: false,
        activeSessionId: null
      }
    }
    localStorage.setItem('parkingSpots', JSON.stringify(parkingSpots.value))
  } catch (error) {
    console.error('Ошибка удаления сессии:', error)
    throw error
  }
}


  return {
    parkingSpots,
    cars,
    owners,
    loading,
    loadSpots,
    saveSession,
    loadCarsAndOwners,
    paySession,
    deleteSession
  }
})

