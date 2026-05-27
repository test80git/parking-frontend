<!-- страница оплаты -->
<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content payment-page">
      <h2>Оплата парковки</h2>
      <div v-if="bookings.length === 0" class="empty-state">
        Нет активных броней
      </div>
      <div v-for="booking in bookings" :key="booking.id" class="booking-card">
        <p><strong>Место:</strong> {{ booking.number }}</p>
        <p><strong>Авто:</strong> {{ booking.carNumber }}</p>
        <p><strong>Владелец:</strong> {{ booking.bookingName }}</p>
        <p><strong>Статус:</strong> {{ booking.isPaid ? 'Оплачено' : 'Не оплачено' }}</p>
        <button 
          v-if="!booking.isPaid" 
          @click="$emit('pay', booking)" 
          class="pay-btn"
        >
          Оплатить
        </button>
      </div>
      <button @click="$emit('close')" class="close-payment">Закрыть</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  bookings: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close', 'pay'])
</script>

<style scoped>
.payment-page {
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.booking-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background: #f9f9f9;
}

.pay-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.close-payment {
  width: 100%;
  padding: 10px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>