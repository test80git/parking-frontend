<template>
  <div class="lots-view">
    <h2>Автостоянки</h2>
    
    <button @click="openAddModal" class="add-btn">+ Новая стоянка</button>
    
    <!-- Список стоянок -->
    <div class="lots-list">
      <div v-for="lot in lots" :key="lot.id" class="lot-card" :class="{'current-lot': lot.isCurrent}">
        <div class="lot-info">
          <h3>{{ lot.name }}</h3>
          <p>Размер: {{ lot.rowsCount }} × {{ lot.colsCount }} = {{ lot.rowsCount * lot.colsCount }} мест</p>
          <p>Цена: {{ lot.pricePerDay }} ₽/день</p>
          <p>Создана: {{ formatDate(lot.createdAt) }}</p>
        </div>
        <div class="lot-actions">           
          <button v-if="!lot.isCurrent" @click="setCurrentLot(lot.id)" class="set-current-btn">
            Сделать активной
          </button>
          <span v-else class="current-badge">✅ Активная</span>
          <button @click="editLot(lot)" class="edit-btn">✏️</button>
          <button @click="deleteLot(lot.id)" class="delete-btn">🗑️</button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно добавления/редактирования -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Редактировать стоянку' : 'Новая стоянка' }}</h3>
        
        <label>Название:</label>
        <input v-model="form.name" placeholder="Северная стоянка">
        
        <label>Количество рядов:</label>
        <input type="number" v-model="form.rowsCount" min="1" max="10">
        
        <label>Количество мест в ряду:</label>
        <input type="number" v-model="form.colsCount" min="1" max="10">
        
        <label>Цена за день (₽):</label>
        <input type="number" v-model="form.pricePerDay" min="0">
        
        <div class="modal-buttons">
          <button @click="saveLot" :disabled="saving">Сохранить</button>
          <button @click="closeModal">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const lots = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const form = ref({
  name: '',
  rowsCount: 4,
  colsCount: 5,
  pricePerDay: 100
})

const formatDate = (dateTime) => {
  if (!dateTime) return ''
  return new Date(dateTime).toLocaleDateString('ru-RU')
}

const loadLots = async () => {
  try {
    const response = await api.getLots()
    lots.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки:', error)
  }
}

const setCurrentLot = async (lotId) => {
  try {
    // await api.put(`/lots/${lotId}/set-current`)
    await api.setCurrentLot(lotId)
    await loadLots()
    // Перезагрузить карту парковки
    window.location.reload()
  } catch (error) {
    console.error('Ошибка:', error)
  }
}

const openAddModal = () => {
  isEditing.value = false // это новая стоянка, не редактирование
  form.value = { name: '', rowsCount: 4, colsCount: 5, pricePerDay: 100 }
  showModal.value = true // показать модальное окно
}

const editLot = (lot) => {
  isEditing.value = true
  form.value = { ...lot }
  showModal.value = true
}

const saveLot = async () => {
  saving.value = true
  try {
    console.log('Отправка:', form.value)
    if (isEditing.value) {
        // редактируем
        await api.updateLot(form.value.id, form.value)    
    } else {
        // создаем новую стоянку
    const response = await api.createLot( form.value)       
    console.info("Response ",response)
    }
    await loadLots()
    closeModal()
  } catch (error) {
    console.error('Ошибка сохранения:', error)
    console.error('Статус:', error.response?.status)
    console.error('Данные ошибки:', error.response?.data)
    alert('Ошибка сохранения')
  } finally {
    saving.value = false
  }
}

const deleteLot = async (id) => {
  if (confirm('Удалить стоянку? Все места и брони будут удалены!')) {
    try {
      await api.deleteLot(id)
      await loadLots()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка удаления')
    }
  }
}

const closeModal = () => {
  showModal.value = false
}

onMounted(() => {
  loadLots()
})
</script>

<style scoped>
.lots-view {
  padding: 20px;
}

.lot-card.current-lot {
  background: #17d844;
  border: 2px solid #28a745;
}

.add-btn {
  margin-bottom: 20px;
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.lots-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.lot-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.lot-info h3 {
  margin: 0 0 10px 0;
}

.lot-info p {
  margin: 5px 0;
}

.lot-actions {
  display: flex;
  gap: 10px;
}

.set-current-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.current-badge {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border-radius: 4px;
}

.edit-btn, .delete-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-btn {
  background: #ffc107;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

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
  width: 400px;
}

.modal-content label {
  display: block;
  margin-top: 10px;
  font-weight: bold;
}

.modal-content input {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-buttons button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons button:first-child {
  background: #4caf50;
  color: white;
}

.modal-buttons button:last-child {
  background: #f44336;
  color: white;
}
</style>