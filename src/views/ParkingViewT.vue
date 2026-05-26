<template>
  <div class="parking-table">
    <h2>Карта парковки</h2>
    
    <!-- Статус загрузки -->
    <div v-if="store.loading" class="loading">Загрузка...</div>
    
    <!-- Фильтр по статусу -->
    <div class="controls">
      <label>Фильтр по статусу:</label>
      <select v-model="statusFilter">
        <option value="all">Все</option>
        <option value="free">Свободно</option>
        <option value="occupied">Занято</option>
      </select>
    </div>

    <!-- Сетка мест -->
    <div class="parking-grid">
      <div v-for="spot in filteredSpots" :key="spot.id" 
           class="parking-spot"
           :class="spot.status"
           @click="openEditModal(spot)">
        <div class="spot-header">
          <div class="spot-number">{{ spot.spotNumber }}</div>
          <div class="spot-status">{{ getStatusText(spot.status) }}</div>
        </div>
        <div class="spot-info">{{ spot.activeSession?.carNumber || '' }}</div>
        <div class="spot-info">{{ spot.activeSession?.ownerName || '' }}</div>
        <div class="spot-paid" v-if="spot.activeSession">
          Оплата: {{ spot.activeSession.isPaid ? '✅ Оплачено' : '❌ Не оплачено' }}
        </div>
      </div>
    </div>

    <!-- Модальное окно -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h3>Место {{ currentSpot?.spotNumber }}</h3>
        
        <label>Статус:</label>
        <select v-model="currentSpot.status">
          <option value="free">Свободно</option>
          <option value="occupied">Занято</option>
        </select>

        <template v-if="currentSpot.status === 'occupied'">
          <label>Выберите машину:</label>
          <select v-model="selectedCarId">
            <option :value="null">-- Выберите --</option>
            <option v-for="car in store.cars" :key="car.id" :value="car.id">
              {{ car.plateNumber }} - {{ car.brand }}
            </option>
          </select>

          <label>Владелец (поиск):</label>
          <input type="text" v-model="ownerSearch" placeholder="Введите ФИО" @input="searchOwners">
          <select v-model="selectedOwnerId" v-if="filteredOwners.length">
            <option :value="null">-- Выберите --</option>
            <option v-for="owner in filteredOwners" :key="owner.id" :value="owner.id">
              {{ owner.fullName }} - {{ owner.phone }}
            </option>
          </select>

          <label>Дата начала:</label>
          <input type="datetime-local" v-model="startTime">

          <label>Дата окончания (+24 часа):</label>
          <input type="datetime-local" v-model="endTime">

          <div class="payment-section">
            <label>Оплата:</label>
            <button @click="isPaid = !isPaid" class="payment-btn" :class="{ paid: isPaid }">
              {{ isPaid ? 'Оплачено' : 'Не оплачено' }}
            </button>
          </div>
        </template>

        <template v-else-if="currentSpot.status === 'free' && currentSpot.activeSession">
          <p>Это место занято. Освободить?</p>
          <button @click="handleRelease" class="release-btn">Освободить место</button>
        </template>

        <div class="modal-buttons">
          <button @click="saveSpot" :disabled="loadingSave">Сохранить</button>
          <button @click="closeModal">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useParkingStore } from '../stores/parking'

const store = useParkingStore()

// Состояние
const statusFilter = ref('all')
const showModal = ref(false)
const currentSpot = ref(null)
const selectedCarId = ref(null)
const selectedOwnerId = ref(null)
const ownerSearch = ref('')
const filteredOwners = ref([])
const startTime = ref('')
const endTime = ref('')
const isPaid = ref(false)
const loadingSave = ref(false)

// Фильтрация мест
const filteredSpots = computed(() => {
  if (statusFilter.value === 'all') {
    return store.spotsWithStatus
  }
  return store.spotsWithStatus.filter(spot => spot.status === statusFilter.value)
})

// Текст статуса
const getStatusText = (status) => {
  return status === 'free' ? 'Свободно' : 'Занято'
}

// Поиск владельцев
const searchOwners = async () => {
  if (ownerSearch.value.length >= 2) {
    const results = await store.searchOwners(ownerSearch.value)
    filteredOwners.value = results
  } else {
    filteredOwners.value = store.owners
  }
}

// Открыть модальное окно
const openEditModal = (spot) => {
  currentSpot.value = { ...spot }
  showModal.value = true
  
  if (spot.activeSession) {
    selectedCarId.value = spot.activeSession.carId
    isPaid.value = spot.activeSession.isPaid
    // Форматирование даты для input datetime-local
    const start = new Date(spot.activeSession.startTime)
    const end = new Date(spot.activeSession.endTime)
    startTime.value = start.toISOString().slice(0, 16)
    endTime.value = end.toISOString().slice(0, 16)
  } else {
    selectedCarId.value = null
    selectedOwnerId.value = null
    startTime.value = ''
    endTime.value = ''
    isPaid.value = false
  }
}

// Сохранить изменения
const saveSpot = async () => {
  if (currentSpot.value.status === 'occupied') {
    if (!selectedCarId.value) {
      alert('Выберите машину')
      return
    }
    
    // Рассчитать цену (100₽ в день)
    const start = new Date(startTime.value)
    const end = new Date(endTime.value)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    const totalPrice = days * 100
    
    const sessionData = {
      spotId: currentSpot.value.id,
      carId: selectedCarId.value,
      startTime: startTime.value,
      endTime: endTime.value,
      totalPrice: totalPrice
    }
    
    loadingSave.value = true
    try {
      await store.createSession(sessionData)
      closeModal()
    } finally {
      loadingSave.value = false
    }
  }
}

// Освободить место
const handleRelease = async () => {
  if (currentSpot.value.activeSession) {
    loadingSave.value = true
    try {
      await store.deleteSession(currentSpot.value.activeSession.id)
      closeModal()
    } finally {
      loadingSave.value = false
    }
  }
}

// Закрыть модальное окно
const closeModal = () => {
  showModal.value = false
  currentSpot.value = null
  selectedCarId.value = null
  selectedOwnerId.value = null
  ownerSearch.value = ''
  startTime.value = ''
  endTime.value = ''
  isPaid.value = false
}

// Загрузка данных
onMounted(async () => {
  // Заглушка: пока используем lotId = 1
  store.currentLot = { id: 1 }
  
  await Promise.all([
    store.loadSpots(1),
    store.loadCars(),
    store.loadOwners()
  ])
})
</script>

<style scoped>
.parking-table {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.loading {
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #666;
}

.controls {
  margin-bottom: 20px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 5px;
}

.parking-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  max-width: 800px;
  margin: 0 auto;
}

.parking-spot {
  border: 2px solid #333;
  border-radius: 8px;
  padding: 15px 5px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
  min-height: 100px;
}

.parking-spot:hover {
  transform: scale(1.05);
}

.spot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.spot-number {
  font-weight: bold;
  font-size: 18px;
  flex: 1;
  text-align: center;
}

.spot-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.1);
  min-width: 65px;
  text-align: center;
}

.spot-info {
  font-size: 12px;
  margin: 5px 0;
  word-wrap: break-word;
}

.spot-paid {
  font-size: 10px;
  margin-top: 5px;
  font-weight: bold;
}

/* Цвета статусов */
.parking-spot.free {
  background-color: #90ee90;
  border-color: #2e7d32;
}

.parking-spot.occupied {
  background-color: #ff6b6b;
  border-color: #c62828;
}

/* Модальное окно */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 350px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content label {
  font-weight: bold;
  margin-top: 10px;
  display: block;
}

.modal-content input,
.modal-content select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 5px;
  box-sizing: border-box;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-buttons button {
  flex: 1;
  padding: 8px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
}

.modal-buttons button:first-child {
  background: #4caf50;
  color: white;
}

.modal-buttons button:last-child {
  background: #f44336;
  color: white;
}

.payment-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ccc;
}

.payment-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 5px;
}

.payment-btn.paid {
  background: #dc3545;
}

.release-btn {
  background: #ff9800;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
}
</style>