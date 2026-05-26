<!-- модальное окно редактирования -->
<template>
<div class="modal" @click.self="$emit('close')">
    <div class="modal-content">
        <h3>Место {{ localSpot?.number }}</h3>

<!-- Список всех записей (бронь и занято) -->
<div v-if="allBookings?.length" class="future-bookings">
  <label>Записи:</label>
  <div v-for="booking in allBookings" :key="booking.id" 
       class="booking-item"
       :class="{ 'booking-occupied': booking.status === 'occupied', 'booking-booked': booking.status === 'booked' }"
       @click="editBooking(booking)">
    <div class="booking-info">
      <span class="booking-type">{{ booking.status === 'occupied' ? 'З' : 'Б' }}</span>
      <span>{{ formatDateTime(booking.startTime) }} - {{ formatDateTime(booking.endTime) }}</span>
      <span class="booking-status">{{ booking.isPaid ? '✅' : '❌' }}</span>
    </div>
    <button @click.stop="cancelBooking(booking.id)" class="cancel-btn">✖</button>
  </div>
</div>

<!-- Кнопка добавления новой брони -->
<button v-if="showNewBookingForm === false" @click="showNewBookingForm = true" class="add-booking-btn">
  + Добавить бронь
</button>

<!-- Кнопка "Занять сейчас" -->
<button v-if="canOccupyNow" @click="occupyNow" class="occupy-now-btn">
  🚗 Занять сейчас (место свободно)
</button>

        <!-- Форма новой брони -->
        <div v-if="showNewBookingForm" class="new-booking-form">
            <h4>Новая бронь</h4>

            <label>Марка автомобиля:</label>
            <input v-model="newBooking.carBrand" placeholder="Ford Focus">

            <label>Номер автомобиля:</label>
            <input v-model="newBooking.carNumber" placeholder="H005EM77" @blur="formatCarNumberNew">

            <label>Имя владельца:</label>
            <input v-model="newBooking.bookingName" placeholder="Иван Иванов">

            <label>Телефон:</label>
            <input v-model="newBooking.phone" @input="handlePhoneInputNew" placeholder="+7 XXX XXX-XX-XX">

            <label>Время заезда:</label>
            <input type="datetime-local" v-model="newBooking.dateTimeIn">

            <label>Время окончания:</label>
            <input type="datetime-local" v-model="newBooking.dateTimeOut">

            <div class="modal-buttons">
                <button @click="addNewBooking" :disabled="saving">Добавить</button>
                <button @click="showNewBookingForm = false">Отмена</button>
            </div>
        </div>

        <label>Статус:</label>
        <select v-model="localSpot.status">
            <option value="free">Свободно</option>
            <option value="booked">Забронировано</option>
            <option value="occupied">Занято</option>
        </select>

        <label>Марка автомобиля:</label>
        <input v-model="localSpot.carBrand" placeholder="Ford Focus">

        <label>Номер автомобиля:</label>
        <input v-model="localSpot.carNumber" placeholder="H005EM77" @blur="formatCarNumber">
        <small>Формат: Буква, 3 цифры, 2 буквы, 2-3 цифры (H005EM77)</small>

        <label>Имя владельца / брони:</label>
        <input v-model="localSpot.bookingName" placeholder="Иван Иванов">

        <label>Телефон:</label>
        <input v-model="localSpot.phone" @input="handlePhoneInput" placeholder="+7 XXX XXX-XX-XX" maxlength="16">

        <label>Время заезда:</label>
        <input type="datetime-local" v-model="localSpot.dateTimeIn">

        <label>Время окончания:</label>
        <input type="datetime-local" v-model="localSpot.dateTimeOut">

        <div class="payment-section" v-if="localSpot?.status !== 'free'">
            <label>Оплата:</label>
            <button @click="localSpot.isPaid = !localSpot.isPaid" class="payment-btn" :class="{ paid: localSpot.isPaid }">
                {{ localSpot?.isPaid ? 'Отменить оплату' : 'Оплатить' }}
            </button>
        </div>

        <div class="modal-buttons">
            <button @click="$emit('save', localSpot)" :disabled="saving">Сохранить</button>
            <button @click="$emit('close')">Отмена</button>
        </div>
    </div>
</div>
</template>

<script setup>
import {
    ref,
    watch,
    computed
} from 'vue'

import api from '../api'

const props = defineProps({
    spot: Object,
    saving: Boolean
})

const futureBookings = computed(() => props.spot?.futureBookings || [])

const emit = defineEmits(['close', 'save', 'cancelBooking', 'editBooking', 'occupyNow'])

const localSpot = ref({
    ...props.spot
})

watch(() => props.spot, (newSpot) => {
    if (newSpot) {
        localSpot.value = {
            ...newSpot
        }
    }
}, {
    deep: true,
    immediate: true
})

// Вычисляем, можно ли занять сейчас
const canOccupyNow = computed(() => {
  if (!props.spot) return false
  // Место свободно сейчас И есть будущие брони
  const hasFutureBookings = props.spot.futureBookings?.length > 0
  return props.spot.status === 'free' && hasFutureBookings
})

const isEditing = ref(false)

// Редактировать бронь
const editBooking = (booking) => {
    isEditing.value = true
  emit('editBooking', booking)
}

// Занять сейчас
const occupyNow = () => {
  emit('occupyNow', props.spot.id)
}

const showNewBookingForm = ref(false)
const newBooking = ref({
    carBrand: '',
    carNumber: '',
    bookingName: '',
    phone: '',
    dateTimeIn: '',
    dateTimeOut: ''
})

// Транслитерация
const transliterate = (str) => {
    const map = {
        'А': 'A',
        'В': 'B',
        'Е': 'E',
        'К': 'K',
        'М': 'M',
        'Н': 'H',
        'О': 'O',
        'Р': 'P',
        'С': 'C',
        'Т': 'T',
        'У': 'Y',
        'Х': 'X'
    }
    return str.toUpperCase().split('').map(ch => map[ch] || ch).join('')
}

const regex = /^[A-Z]\d{3}[A-Z]{2}\d{2,3}$/

const formatCarNumber = () => {
    if (!localSpot.value.carNumber) return
    let number = transliterate(localSpot.value.carNumber).replace(/\s/g, '').toUpperCase()
    if (!regex.test(number)) {
        alert('Неверный формат номера. Пример: H005EM77 или A123BC777')
        return
    }
    localSpot.value.carNumber = number
}

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
    const rawValue = localSpot.value.phone.replace(/\D/g, '')
    localSpot.value.phone = formatPhoneNumber(rawValue)
}

const setAutoEndTime = () => {
    if (localSpot.value.dateTimeIn) {
        const startDate = new Date(localSpot.value.dateTimeIn)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1)
        endDate.setHours(endDate.getHours() + 3)
        localSpot.value.dateTimeOut = endDate.toISOString().slice(0, 16)
    }
}

// const formatDateTime = (dateTime) => {
//     if (!dateTime) return ''
//     const date = new Date(dateTime)
//     return date.toLocaleString('ru-RU', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//     })
// }

const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth()+1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const formatCarNumberNew = () => {
    if (!newBooking.value.carNumber) return
    let number = transliterate(newBooking.value.carNumber).replace(/\s/g, '').toUpperCase()
    if (!regex.test(number)) {
        alert('Неверный формат номера. Пример: H005EM77 или A123BC777')
        return
    }
    newBooking.value.carNumber = number
}

const handlePhoneInputNew = (event) => {
    const rawValue = newBooking.value.phone.replace(/\D/g, '')
    newBooking.value.phone = formatPhoneNumber(rawValue)
}

watch(() => localSpot.value?.dateTimeIn, () => {
    if (localSpot.value?.dateTimeIn && !isEditing.value) {
        setAutoEndTime()
    }
})


const cancelBooking = (bookingId) => {
    console.log('Отмена брони с ID:', bookingId)
    emit('cancelBooking', bookingId)
}

// Все записи (сортированные по дате)
const allBookings = computed(() => {
  if (!props.spot?.allSessions) return []
  return [...props.spot.allSessions].sort((a, b) => 
    new Date(a.startTime) - new Date(b.startTime)
  )
})

// Функция добавления новой брони
const addNewBooking = async () => {
    if (!newBooking.value.carNumber) {
        alert('Укажите номер автомобиля')
        return
    }
    if (!newBooking.value.dateTimeIn || !newBooking.value.dateTimeOut) {
        alert('Укажите даты')
        return
    }

    const sessionData = {
        spotId: props.spot.id,
        carNumber: newBooking.value.carNumber,
        carBrand: newBooking.value.carBrand,
        ownerName: newBooking.value.bookingName,
        phone: newBooking.value.phone,
        startTime: newBooking.value.dateTimeIn,
        endTime: newBooking.value.dateTimeOut,
        totalPrice: 100,
        isPaid: false,
        status: 'booked'
    }

    try {
        const response = await api.createSession(sessionData)
        console.log('Бронь создана:', response.data)

        // Обновить данные
        const updatedSessions = await api.get(`/spots/${props.spot.id}/sessions`)
        const now = new Date()
        const futureBookings = updatedSessions.data.filter(s => new Date(s.startTime) > now)

        // Обновить localSpot
        localSpot.value.futureBookings = futureBookings

        showNewBookingForm.value = false
        newBooking.value = {
            carBrand: '',
            carNumber: '',
            bookingName: '',
            phone: '',
            dateTimeIn: '',
            dateTimeOut: ''
        }

        alert('Бронь добавлена успешно')
    } catch (error) {
        if (error.response?.status === 400) {
        const message = error.response.data?.error || 'Ошибка'
        alert(message)
    } else {
        alert('Ошибка сохранения')
    }
    }
}
</script>

<style scoped>
.add-booking-btn {
    width: 100%;
    padding: 8px;
    margin: 10px 0;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.new-booking-form {
    border-top: 1px solid #ccc;
    margin-top: 10px;
    padding-top: 10px;
}

.new-booking-form h4 {
    margin: 0 0 10px 0;
}

.future-bookings {
  margin-bottom: 10px;
}

.booking-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  flex-wrap: nowrap;      /* запрещаем перенос */
  overflow-x: hidden;       /* скролл - нет*/
  font-size: 11px;
}

.booking-info span {
  white-space: nowrap;
  font-size: 11px;
}

.booking-type {
  font-weight: bold;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;  /* чтобы буква не сжималась */
}

.booking-status {
  font-size: 11px;
  flex-shrink: 0;
}

.booking-occupied .booking-type {
  background-color: #ff0000;
  color: white;
}

.booking-booked .booking-type {
  background-color: #007bff;
  color: white;
}

.booking-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;              
  margin: 3px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 1px 5px;        
  cursor: pointer;
  flex-shrink: 0;
  font-size: 10px;
}
</style>
