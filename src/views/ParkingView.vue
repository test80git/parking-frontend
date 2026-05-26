<template>
  <div class="parking-table">
    <h2>Карта парковки</h2>
    
    <div class="current-datetime">
      📅 {{ currentDate }} | 🕐 {{ currentTime }}
    </div>

    <!-- Поиск -->
    <div class="search-section">
      <input type="text" v-model="searchQuery" placeholder="Поиск по номеру авто или ФИО" class="search-input">
      <button @click="clearSearch" class="clear-search">Очистить</button>
    </div>

    <div class="controls">
      <label>Фильтр по статусу:</label>
      <select v-model="statusFilter">
        <option value="all">Все</option>
        <option value="free">Свободно</option>
        <option value="booked">Бронь</option>
        <option value="occupied">Занято</option>
      </select>
    </div>

    <div v-if="store.loading" class="loading">Загрузка...</div>

    <div class="parking-grid">
      <div v-for="spot in filteredAndSearchedSpots" :key="spot.id" 
           class="parking-spot"
           :class="spot.status"
           @click="openEditModal(spot)">
     <!-- Маркер будущих броней -->
        <span v-if="spot.hasFutureBookings" class="future-booking-marker" title="Есть будущие брони">📅</span>
        
        <div class="spot-header">
          <div class="spot-number">{{ spot.number }}</div>
          <div class="spot-status">{{ getStatusText(spot.status) }}</div>
        </div>    
        <div class="spot-info">{{ spot.carBrand || '' }}</div>
        <div class="spot-info">{{ spot.carNumber || spot.bookingName || '' }}</div>
        <div class="spot-time">
          <div class="spot-info">{{ formatDateTime(spot.dateTimeIn) }}</div>
          <div class="spot-info">{{ formatDateTime(spot.dateTimeOut) }}</div>
        </div>
        <div class="spot-paid" v-if="spot.status !== 'free'">
          Оплата: {{ spot.isPaid ? '✅ Оплачено' : '❌ Не оплачено' }}
        </div>
      </div>
    </div>

    <!-- Модальное окно (компонент) -->
    <SpotModal 
      v-if="showModal"
      :spot="currentSpot"
      :saving="saving"
      @close="closeModal"
      @save="handleSave"
      @cancel-booking="handleCancelBooking"
      @edit-booking="handleEditBooking"
      @occupy-now="handleOccupyNow"
    />  

    <!-- Страница оплаты -->
    <div v-if="showPaymentPage" class="modal" @click.self="closePaymentPage">
      <div class="modal-content payment-page">
        <h2>Оплата парковки</h2>
        <div v-for="booking in activeBookings" :key="booking.id" class="booking-card">
          <p><strong>Место:</strong> {{ booking.number }}</p>
          <p><strong>Авто:</strong> {{ booking.carNumber }}</p>
          <p><strong>Владелец:</strong> {{ booking.bookingName }}</p>
          <p><strong>Статус:</strong> {{ booking.isPaid ? 'Оплачено' : 'Не оплачено' }}</p>
          <button v-if="!booking.isPaid" @click="payForBooking(booking)" class="pay-btn">
            Оплатить
          </button>
        </div>
        <button @click="closePaymentPage" class="close-payment">Закрыть</button>
      </div>
    </div>

    <button @click="openPaymentPage" class="open-payment-btn">💳 Оплата</button>
  </div>

  
</template>

<script setup>
import api from '../api'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'  // ← добавил watch
import { useParkingStore } from '../stores/parking'
import SpotModal from '../components/SpotModal.vue'
import '../styles/parking.css'

const store = useParkingStore()

// Время
const currentDate = ref('')
const currentTime = ref('')
let timerInterval = null

const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('ru-RU')
  currentTime.value = now.toLocaleTimeString('ru-RU')
}

// Состояние UI
const statusFilter = ref('all')
const searchQuery = ref('')
const showModal = ref(false)
const showPaymentPage = ref(false)
const currentSpot = ref(null)
const saving = ref(false)

// Вспомогательная функция (перенесла перед использованием)
const getColorByStatus = (status) => {
  if (status === 'free') return '🟢 зеленый'
  if (status === 'booked') return '🔵 синий'
  if (status === 'occupied') return '🔴 красный'
  return '❓'
}

// Форматирование даты
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  return date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Транслитерация номера
const transliterate = (str) => {
  const map = {
    'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M',
    'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'У': 'Y', 'Х': 'X'
  }
  return str.toUpperCase().split('').map(ch => map[ch] || ch).join('')
}

const regex = /^[A-Z]\d{3}[A-Z]{2}\d{2,3}$/

const formatCarNumber = () => {
  if (!currentSpot.value?.carNumber) return
  let number = transliterate(currentSpot.value.carNumber).replace(/\s/g, '').toUpperCase()
  if (!regex.test(number)) {
    alert('Неверный формат номера. Пример: H005EM77 или A123BC777')
    return
  }
  currentSpot.value.carNumber = number
}

// Телефон
const formatPhoneNumber = (value) => {
  let numbers = value.replace(/\D/g, '')
  if (numbers.startsWith('8')) numbers = '7' + numbers.slice(1)
  if (!numbers.startsWith('7')) numbers = '7' + numbers
  numbers = numbers.slice(0, 11)
  let formatted = '+7'
  if (numbers.length > 1) formatted += ' ' + numbers.slice(1, 4)
  if (numbers.length > 4) formatted += ' ' + numbers.slice(4, 7)
  if (numbers.length > 7) formatted += ' ' + numbers.slice(7, 9)
  if (numbers.length > 9) formatted += ' ' + numbers.slice(9, 11)
  return formatted.trim()
}

const handlePhoneInput = (event) => {
  const rawValue = currentSpot.value.phone.replace(/\D/g, '')
  currentSpot.value.phone = formatPhoneNumber(rawValue)
}

// Фильтрация
const filteredAndSearchedSpots = computed(() => {
  let spots = store.parkingSpots

  if (statusFilter.value !== 'all') {
    spots = spots.filter(spot => spot.status === statusFilter.value)
  }
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    spots = spots.filter(spot =>
      spot.carNumber?.toLowerCase().includes(query) ||
      spot.bookingName?.toLowerCase().includes(query)
    )
  }
  console.log('Статусы мест:', spots.map(s => ({ number: s.number, status: s.status })))

  // Просто возвращаем spots, без перезаписи статуса
  return spots
})

// watch для отслеживания
watch(() => store.parkingSpots, (newSpots) => {
  console.log('=== PARKING SPOTS ИЗМЕНИЛИСЬ ===')
  console.log('Все места:', newSpots)
  newSpots.forEach(spot => {
    console.log(`Место ${spot.number}: статус="${spot.status}", цвет=${getColorByStatus(spot.status)}`)
  })
}, { deep: true, immediate: true })

const activeBookings = computed(() => {
  return store.parkingSpots.filter(spot => spot.status !== 'free' && spot.carNumber)
})

const getStatusText = (status) => {
  const map = { free: 'Свободно', booked: 'Бронь', occupied: 'Занято' }
  return map[status]
}

const openEditModal = async (spot) => {
  try {
    const sessions = await api.get(`/spots/${spot.id}/sessions`)
    const now = new Date()
    const futureBookings = sessions.data.filter(s => new Date(s.startTime) > now)
    
    currentSpot.value = { 
      ...spot, 
      futureBookings: futureBookings,
      allSessions: sessions.data 
    }
    showModal.value = true
  } catch (error) {
    console.error('Ошибка загрузки броней:', error)
    currentSpot.value = { ...spot, futureBookings: [], allSessions: [] }
    showModal.value = true
  }
}

// const handleSave = async (updatedSpot) => {
//   saving.value = true
//   try {
//     await store.saveSession(updatedSpot)
//     await store.loadSpots()
//     closeModal()
//   } catch (error) {
//     console.error('Ошибка сохранения:', error)
//     alert('Ошибка сохранения')
//   } finally {
//     saving.value = false
//   }
// }

const handleSave = async (updatedSpot) => {
  saving.value = true
  try {
    // Если есть activeSessionId — обновляем существующую сессию
    if (updatedSpot.activeSessionId) {
      const sessionData = {
        endTime: updatedSpot.dateTimeOut,
        totalPrice: 100, // пересчитать
        isPaid: updatedSpot.isPaid,
        status: updatedSpot.status,
        carNumber: updatedSpot.carNumber,
        carBrand: updatedSpot.carBrand,
        ownerName: updatedSpot.bookingName,
        phone: updatedSpot.phone
      }
      await api.put(`/sessions/${updatedSpot.activeSessionId}`, sessionData)
    } else {
      // Создание новой сессии
      await store.saveSession(updatedSpot)
    }
    await store.loadSpots()
    closeModal()
  } catch (error) {
    console.error('Ошибка сохранения:', error)
    alert('Ошибка сохранения')
  } finally {
    saving.value = false
  }
}

const handleCancelBooking = async (bookingId) => {
  console.log('handleCancelBooking вызван, ID:', bookingId)
  if (confirm('Отменить бронь?')) {
    try {
    await store.deleteSession(bookingId)
    console.log('Сессия удалена')
    await store.loadSpots()
    closeModal()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка удаления брони')
    }
  }
}

// Редактирование брони
const handleEditBooking = (booking) => {
  console.log('Редактирование брони:', booking)
    // Форматируем даты для input datetime-local
  const formatForInput = (dateTime) => {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    return date.toISOString().slice(0, 16)
  }
  // Загружаем данные брони в форму
  currentSpot.value = {
    ...currentSpot.value,
    carBrand: booking.carBrand || '',
    carNumber: booking.carNumber || '',
    bookingName: booking.ownerName || '',
    phone: booking.phone || '',
    dateTimeIn: formatForInput(booking.startTime),
    dateTimeOut: formatForInput(booking.endTime),  // ← берём из БД
    isPaid: booking.isPaid || false,
    status: booking.status || 'booked',
    activeSessionId: booking.id  // для обновления, а не создания
  }
  // Модальное окно уже открыто, просто обновили данные
}

// Занять сейчас (превратить бронь в занятость)
const handleOccupyNow = async (spotId) => {
  if (confirm('Занять место сейчас? Бронь останется, но начнётся занятость')) {
    // Находим ближайшую будущую бронь
    const spot = store.parkingSpots.find(s => s.id === spotId)
    const futureBooking = spot.futureBookings?.[0]
    
    if (futureBooking) {
      // Создаём новую сессию со статусом 'occupied' на те же даты
      const sessionData = {
        spotId: spot.id,
        carNumber: futureBooking.carNumber,
        carBrand: futureBooking.carBrand,
        ownerName: futureBooking.ownerName,
        phone: futureBooking.phone,
        startTime: new Date().toISOString().slice(0, 16),  // сейчас
        endTime: futureBooking.endTime,
        totalPrice: 100,
        isPaid: false,
        status: 'occupied'
      }
      
      try {
        await api.createSession(sessionData)
        await store.loadSpots()
        closeModal()
        alert('Место занято')
      } catch (error) {
        console.error('Ошибка:', error)
        alert('Не удалось занять место')
      }
    }
  }
}

const payForBooking = async (booking) => {
  console.log('Оплата для:', booking)
  if (booking.activeSessionId) {
    try {
      await store.paySession(booking.activeSessionId)
      booking.isPaid = true
      const index = store.parkingSpots.findIndex(s => s.id === booking.id)
      if (index !== -1) {
        store.parkingSpots[index].isPaid = true
      }
      alert('Оплата прошла успешно')
    } catch (error) {
      console.error('Ошибка оплаты:', error)
      alert('Ошибка оплаты')
    }
  }
}

const closeModal = () => {
  showModal.value = false
  currentSpot.value = null
}

const openPaymentPage = () => { showPaymentPage.value = true }
const closePaymentPage = () => { showPaymentPage.value = false }
const clearSearch = () => { searchQuery.value = '' }

// Загрузка
onMounted(async () => {
  updateDateTime()
  timerInterval = setInterval(updateDateTime, 1000)
  await store.loadSpots()
  await store.loadCarsAndOwners()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>


<style scoped>
.future-booking {
  cursor: pointer;
}

.future-booking:hover {
  background-color: #e0e0e0;
}

.booking-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.occupy-now-btn {
  width: 100%;
  padding: 8px;
  margin-top: 10px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.occupy-now-btn:hover {
  background: #f57c00;
}

.booking-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 5px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.booking-occupied {
  background-color: #ffcccc;
  border-left: 4px solid #ff0000;
}

.booking-booked {
  background-color: #cce5ff;
  border-left: 4px solid #007bff;
}

.booking-item:hover {
  opacity: 0.7;
}

.booking-type {
  font-weight: bold;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 10px;
}

.booking-occupied .booking-type {
  background-color: #ff0000;
  color: white;
}

.booking-booked .booking-type {
  background-color: #007bff;
  color: white;
}

.booking-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.booking-status {
  font-size: 14px;
}
</style>
