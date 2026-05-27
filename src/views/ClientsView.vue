<template>
  <div class="clients-view">
    <h2>Клиенты</h2>
    
    <button @click="openAddModal" class="add-btn">+ Добавить клиента</button>
    
    <!-- Таблица клиентов -->
    <div class="table-container">
      <table class="clients-table">
        <thead>
          <tr>
            <th>№</th>
            <th>ФИО</th>
            <th>Телефон</th>
            <th>Автомобили</th>
            <th>Дата регистрации</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(client, index) in paginatedClients" :key="client.owner.id">
            <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
            <td>{{ client.owner.fullName }}</td>
            <td>{{ client.owner.phone }}</td>
            <td>
              <div v-for="car in client.cars" :key="car.id" class="car-item">
                {{ car.plateNumber }} ({{ car.brand }})
              </div>
            </td>
            <td>{{ formatDate(client.owner.createdAt) }}</td>
            <td>
              <button @click="openEditModal(client)" class="edit-btn">✏️</button>
              <button @click="deleteClient(client.owner.id)" class="delete-btn">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Пагинация -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">←</button>
        <span>Страница {{ currentPage }} из {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">→</button>
      </div>
    </div>
    
    <!-- Модальное окно -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Редактировать клиента' : 'Новый клиент' }}</h3>
        
        <label>ФИО:</label>
        <input v-model="form.owner.fullName" placeholder="Иванов Иван Иванович">
        
        <label>Телефон:</label>
        <input v-model="form.owner.phone" placeholder="+7 999 999 99 99">
        
        <label>Автомобили:</label>
        <div v-for="(car, index) in form.cars" :key="index" class="car-form">
          <input v-model="car.plateNumber" placeholder="Номер (H005EM77)">
          <input v-model="car.brand" placeholder="Марка (Toyota Camry)">
          <button @click="removeCar(index)" class="remove-car-btn">✖</button>
        </div>
        <button @click="addCar" class="add-car-btn">+ Добавить машину</button>
        
        <div class="modal-buttons">
          <button @click="saveClient" :disabled="saving">Сохранить</button>
          <button @click="closeModal">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted} from 'vue'
import api from '../api'

const clients = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const currentPage = ref(1) // текущая страница
const itemsPerPage = 10 // количество записей на странице

const form = ref({
  owner: {fullName: '',    phone: ''},
  cars: [{ plateNumber: '', brand: '' }]
})

// Пагинация
const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return clients.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(clients.value.length / itemsPerPage)
})

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const formatDate = (dateTime) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  return date.toLocaleDateString('ru-RU')
}

const loadClients = async () => {
  try {
    const response = await api.get('/clients')
    clients.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки:', error)
  }
}

const openAddModal = () => {
  isEditing.value = false
  form.value = {
    owner: { fullName: '', phone: '' },
    cars: [{ plateNumber: '', brand: '' }]
  }
  showModal.value = true
}

const openEditModal = (client) => {
  isEditing.value = true
  form.value = {
    owner: { ...client.owner },
    cars: client.cars.length ? [...client.cars] : [{ plateNumber: '', brand: '' }]
  }
  showModal.value = true
}

const addCar = () => {
  form.value.cars.push({ plateNumber: '', brand: '' })
}

const removeCar = (index) => {
  form.value.cars.splice(index, 1)
}

const saveClient = async () => {
  saving.value = true
  try {
    if (isEditing.value) {
      // Обновление владельца
     const response = await api.updateClient(form.value.owner.id, form.value.owner)
      console.log("Response from saveClient ", response)
           // 2. Получаем текущие машины клиента из БД
      const currentClient = clients.value.find(c => c.owner.id === form.value.owner.id)
      const currentCarIds = currentClient?.cars.map(c => c.id) || []
      const newCarIds = form.value.cars.filter(c => c.id).map(c => c.id)
      
      // 3. Удаляем машины, которых нет в новой форме
      const toDelete = currentCarIds.filter(id => !newCarIds.includes(id))
      for (const carId of toDelete) {
        await api.deleteCar(carId)
        console.log(`Удалена машина ${carId}`)
      }
      // Обновление машин (упрощённо: удаляем старые, добавляем новые)
      for (const car of form.value.cars) {
        if (car.id) {
          // Если машина с ID — обновляем
          await api.updateCar(car.id, car)
        } else {
          // Если новая машина — создаём
          await api.createCar({            
            plateNumber: car.plateNumber,
            brand: car.brand,
            ownerId: form.value.owner.id })
        }
      }
    } else {
      // Создание нового клиента
      const response = await api.createClient( {
        owner: form.value.owner,
        cars: form.value.cars.filter(c => c.plateNumber || c.brand)
      })
      console.log('Response from saveClient', response)
    }
    await loadClients()
    closeModal()
  } catch (error) {
    console.error('Ошибка сохранения:', error)
    alert('Ошибка сохранения')
  } finally {
    saving.value = false
  }
}

const deleteClient = async (id) => {
  if (confirm('Удалить клиента?')) {
    try {
      await api.deleteClient(id)
      await loadClients()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка удаления')
    }
  }
}

const closeModal = () => {
  showModal.value = false
}

const loadData = async () => {
  await loadClients()
}

// Загружает при первом монтировании
onMounted(() => {
  console.log('ClientsView смонтирован')
  loadData()
})

</script>

<style scoped>
.clients-view {
  padding: 20px;
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

.table-container {
  overflow-x: auto;
}

.clients-table {
  width: 100%;
  border-collapse: collapse;
}

.clients-table th,
.clients-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.clients-table th {
  background-color: #f2f2f2;
}

.car-item {
  font-size: 12px;
  margin: 2px 0;
}

.edit-btn,
.delete-btn {
  margin: 0 2px;
  padding: 4px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.edit-btn {
  background: #ffc107;
  color: #333;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.car-form {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.car-form input {
  flex: 1;
}

.remove-car-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  padding: 0 8px;
}

.add-car-btn {
  margin-top: 8px;
  padding: 4px 8px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
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
  width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content label {
  font-weight: bold;
  margin-top: 10px;
  display: block;
}

.modal-content input {
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

.modal-buttons button:first-child {
  background: #4caf50;
  color: white;
}

.modal-buttons button:last-child {
  background: #f44336;
  color: white;
}
</style>