<template>
  <div class="history-view">
    <h2>История заездов и выездов</h2>
    
    <!-- Фильтры -->
    <div class="filters">
      <div class="filter-row">
        <div class="filter-group">
          <label>Номер авто:</label>
          <input v-model="filters.carNumber" placeholder="H005EM77" @keyup.enter="search">
        </div>
        
        <div class="filter-group">
          <label>Владелец:</label>
          <input v-model="filters.ownerName" placeholder="Иванов" @keyup.enter="search">
        </div>
        
        <div class="filter-group">
          <label>Место:</label>
          <select v-model="filters.spotId">
            <option :value="null">Все</option>
            <option v-for="spot in spots" :key="spot.id" :value="spot.id">
              {{ spot.spotNumber }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Оплата:</label>
          <select v-model="filters.isPaid">
            <option :value="null">Все</option>
            <option :value="true">Оплачено</option>
            <option :value="false">Не оплачено</option>
          </select>
        </div>
      </div>
      
      <div class="filter-row">
        <div class="filter-group">
          <label>Дата с:</label>
          <input type="date" v-model="filters.startDateFrom">
        </div>
        
        <div class="filter-group">
          <label>Дата по:</label>
          <input type="date" v-model="filters.startDateTo">
        </div>
        
        <div class="filter-actions">
          <button @click="search" class="search-btn">🔍 Поиск</button>
          <button @click="resetFilters" class="reset-btn">Сбросить</button>
        </div>
      </div>
    </div>
    
    <!-- Таблица сессий -->
    <div class="table-container">
      <table class="history-table">
<thead>
  <tr>
    <th @click="sort('id')" class="sortable">ID <span class="sort-icon">{{ getSortIcon('id') }}</span></th>
    <th @click="sort('spotNumber')" class="sortable">Место <span class="sort-icon">{{ getSortIcon('spotNumber') }}</span></th>
    <th @click="sort('carNumber')" class="sortable">Авто <span class="sort-icon">{{ getSortIcon('carNumber') }}</span></th>
    <th @click="sort('carBrand')" class="sortable">Марка <span class="sort-icon">{{ getSortIcon('carBrand') }}</span></th>
    <th @click="sort('ownerName')" class="sortable">Владелец <span class="sort-icon">{{ getSortIcon('ownerName') }}</span></th>
    <th>Телефон</th>
    <th @click="sort('startTime')" class="sortable">Заезд <span class="sort-icon">{{ getSortIcon('startTime') }}</span></th>
    <th @click="sort('endTime')" class="sortable">Выезд <span class="sort-icon">{{ getSortIcon('endTime') }}</span></th>
    <th>Дней</th>
    <th @click="sort('totalPrice')" class="sortable">Сумма <span class="sort-icon">{{ getSortIcon('totalPrice') }}</span></th>
    <th @click="sort('isPaid')" class="sortable">Оплата <span class="sort-icon">{{ getSortIcon('isPaid') }}</span></th>
  </tr>
</thead>
        <tbody>
          <tr v-for="session in sessions" :key="session.id">
            <td>{{ session.id }}</td>
            <td>{{ session.spotNumber }}</td>
            <td>{{ session.carNumber }}</td>
            <td>{{ session.carBrand || '-' }}</td>
            <td>{{ session.ownerName || '-' }}</td>
            <td>{{ session.phone || '-' }}</td>
            <td>{{ formatDateTime(session.startTime) }}</td>
            <td>{{ formatDateTime(session.endTime) }}</td>
            <td>{{ calculateDays(session.startTime, session.endTime) }}</td>
            <td>{{ session.totalPrice }} ₽</td>
            <td>
              <span :class="{ paid: session.isPaid, unpaid: !session.isPaid }">
                {{ session.isPaid ? '✅ Оплачено' : '❌ Не оплачено' }}
              </span>
            </td>
          </tr>
          <tr v-if="sessions.length === 0 && !loading">
            <td colspan="11" class="empty-row">Нет данных</td>
          </tr>
        </tbody>
      </table>
      
      <!-- Пагинация -->
      <div v-if="totalPages > 1" class="pagination">
        <button @click="goToPage(1)" :disabled="currentPage === 1">«</button>
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">‹</button>
        <span>Страница {{ currentPage }} из {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">›</button>
        <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages">»</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const sessions = ref([])
const spots = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 10

const filters = ref({
  carNumber: '',
  ownerName: '',
  spotId: null,
  isPaid: null,
  startDateFrom: '',
  startDateTo: ''
})

const sortField = ref('startTime')  // поле для сортировки
const sortOrder = ref('desc')       // asc или desc

// Форматирование даты
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getSortIcon = (field) => {
  if (sortField.value !== field) return '↕️'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

// Расчёт количества дней
const calculateDays = (start, end) => {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  return days
}

// Загрузка мест для фильтра
const loadSpots = async () => {
  try {
    const response = await api.getSpots(1)
    spots.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки мест:', error)
  }
}

// Загрузка сессий
const loadSessions = async () => {
  loading.value = true
  try {
    const requestData = {
      carNumber: filters.value.carNumber || null,
      ownerName: filters.value.ownerName || null,
      spotId: filters.value.spotId || null,
      isPaid: filters.value.isPaid,
      startDateFrom: filters.value.startDateFrom ? filters.value.startDateFrom + 'T00:00:00' : null,
      startDateTo: filters.value.startDateTo ? filters.value.startDateTo + 'T23:59:59' : null,
      page: currentPage.value,
      size: pageSize,
      sortField: sortField.value,  
      sortOrder: sortOrder.value   
    }
        if (filters.value.startDateFrom) {
            console.info("Фильтр: Дата начала ", filters.value.startDateFrom)
      requestData.startDateFrom = filters.value.startDateFrom + 'T00:00:00'
    }
    if (filters.value.startDateTo) {
      requestData.startDateTo = filters.value.startDateTo + 'T23:59:59'
    }

    const response = await api.filterSessions(requestData)
    sessions.value = response.data.content
    totalPages.value = response.data.totalPages
  } catch (error) {
    console.error('Ошибка загрузки сессий:', error)
  } finally {
    loading.value = false
  }
}

// Поиск
const search = () => {
  currentPage.value = 1
  loadSessions()
}

// Сброс фильтров
const resetFilters = () => {
  filters.value = {
    carNumber: '',
    ownerName: '',
    spotId: null,
    isPaid: null,
    startDateFrom: '',
    startDateTo: ''
  }
  currentPage.value = 1
  loadSessions()
}

// Переход на страницу
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadSessions()
  }
}

const sort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  currentPage.value = 1
  loadSessions()
}

onMounted(() => {
  loadSpots()
  loadSessions()
})
</script>

<style scoped>
.history-view {
  padding: 20px;
}

.filters {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 12px;
  font-weight: bold;
}

.filter-group input,
.filter-group select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 150px;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.search-btn,
.reset-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-btn {
  background: #007bff;
  color: white;
}

.reset-btn {
  background: #6c757d;
  color: white;
}

.table-container {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.history-table th,
.history-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.history-table th {
  background: #f2f2f2;
  font-weight: bold;
}

.history-table tr:hover {
  background: #f9f9f9;
}

.paid {
  color: #28a745;
  font-weight: bold;
}

.unpaid {
  color: #dc3545;
  font-weight: bold;
}

.empty-row {
  text-align: center;
  color: #999;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.pagination button {
  padding: 5px 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background-color: #e0e0e0;
}

.sort-icon {
  margin-left: 5px;
  font-size: 12px;
}
</style>
