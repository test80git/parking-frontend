<template>
<div class="parking-spot" :class="spot.status" @click="$emit('click', spot)">
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
</template>

<script setup>
const props = defineProps({
    spot: Object
})

defineEmits(['click'])

const getStatusText = (status) => {
    const map = {
        free: 'Свободно',
        booked: 'Бронь',
        occupied: 'Занято'
    }
    return map[status]
}

const formatDateTime = (dateTime) => {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth()+1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.parking-spot {
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

.parking-spot.free {
    background-color: #90ee90;
    border-color: #2e7d32;
}

.parking-spot.booked {
    background-color: #87ceeb;
    border-color: #1565c0;
}

.parking-spot.occupied {
    background-color: #ff6b6b;
    border-color: #c62828;
}

.future-booking-marker {
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 16px;
    cursor: help;
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

.spot-time {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.spot-paid {
    font-size: 10px;
    margin-top: 5px;
    font-weight: bold;
}
</style>
