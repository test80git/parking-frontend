<!-- дата/время -->
<template>
  <div class="current-datetime">
    📅 {{ currentDate }} | 🕐 {{ currentTime }}
  </div>  
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentDate = ref('')
const currentTime = ref('')
let timerInterval = null

const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('ru-RU')
  currentTime.value = now.toLocaleTimeString('ru-RU')
}

onMounted(() => {
  updateDateTime()
  timerInterval = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.current-datetime {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  padding: 10px;
  margin-bottom: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  color: #333;
}
</style>