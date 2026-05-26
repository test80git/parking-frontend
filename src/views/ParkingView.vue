<template>
<div class="parking-table">
    <h2>Карта парковки</h2>
    <DateTimeDisplay />
    <SearchFilter v-model:search-query="searchQuery" @clear="clearSearch" />
    <StatusFilter v-model="statusFilter" />
    <div v-if="store.loading" class="loading">Загрузка...</div>
    <div class="parking-grid">
        <ParkingSpot v-for="spot in filteredAndSearchedSpots" :key="spot.id" :spot="spot" @click="openEditModal" />
    </div>
    <!-- Модальное окно (компонент) -->
    <SpotModal v-if="showModal" :spot="currentSpot" :saving="saving" @close="closeModal" @save="handleSave" @cancel-booking="handleCancelBooking" @edit-booking="handleEditBooking" @occupy-now="handleOccupyNow" />
    <PaymentModal v-if="showPaymentPage" :bookings="activeBookings" @close="closePaymentPage" @pay="payForBooking" />

    <button @click="openPaymentPage" class="open-payment-btn">💳 Оплата</button>
</div>
</template>

<script setup>
import api from '../api'
import {
    ref,
    computed,
    onMounted,
    onUnmounted,
    watch
} from 'vue'
import {
    useParkingStore
} from '../stores/parking'
import SpotModal from '../components/SpotModal.vue'
import DateTimeDisplay from '../components/DateTimeDisplay.vue'
import SearchFilter from '../components/SearchFilter.vue'
import ParkingSpot from '../components/ParkingSpot.vue'
import PaymentModal from '../components/PaymentModal.vue'
import StatusFilter from '../components/StatusFilter.vue'
import '../styles/parking.css'

const store = useParkingStore()

// Состояние UI
const statusFilter = ref('all')
const searchQuery = ref('')
const showModal = ref(false)
const showPaymentPage = ref(false)
const currentSpot = ref(null)
const saving = ref(false)

// Вспомогательная функция (перенос перед использованием)
const getColorByStatus = (status) => {
    if (status === 'free') return '🟢 зеленый'
    if (status === 'booked') return '🔵 синий'
    if (status === 'occupied') return '🔴 красный'
    return '❓'
}

// Транслитерация номера
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
    console.log('Статусы мест:', spots.map(s => ({
        number: s.number,
        status: s.status
    })))

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
}, {
    deep: true,
    immediate: true
})

const activeBookings = computed(() => {
    return store.parkingSpots.filter(spot => spot.status !== 'free' && spot.carNumber)
})


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
        currentSpot.value = {
            ...spot,
            futureBookings: [],
            allSessions: []
        }
        showModal.value = true
    }
}


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
        dateTimeOut: formatForInput(booking.endTime), // ← берём из БД
        isPaid: booking.isPaid || false,
        status: booking.status || 'booked',
        activeSessionId: booking.id // для обновления, а не создания
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
                startTime: new Date().toISOString().slice(0, 16), // сейчас
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

const openPaymentPage = () => {
    showPaymentPage.value = true
}
const closePaymentPage = () => {
    showPaymentPage.value = false
}
const clearSearch = () => {
    searchQuery.value = ''
}

// Загрузка
onMounted(async () => {
    await store.loadSpots()
    await store.loadCarsAndOwners()
})

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval)
})
</script>


<style scoped>
.parking-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  max-width: 800px;
  margin: 0 auto;
}

/* .parking-spot {
  border: 2px solid #333;
  border-radius: 8px;
  padding: 15px 5px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
  min-height: 100px;
  position: relative;
}

.parking-spot:hover {
  transform: scale(1.05);
}

.future-booking-marker {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 16px;
  cursor: help;
} */

</style>
