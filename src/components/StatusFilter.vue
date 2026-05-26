<template>
  <div class="controls">
    <label>Фильтр по статусу:</label>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option value="all">Все</option>
      <option value="free">Свободно</option>
      <option value="booked">Бронь</option>
      <option value="occupied">Занято</option>
    </select>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'all'
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.controls {
  margin-bottom: 20px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 5px;
}
</style>