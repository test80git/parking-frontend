<!-- поиск + фильтр -->
<template>
<div class="search-section">
    <input 
      type="text" 
      :value="searchQuery" 
      @input="$emit('update:searchQuery', $event.target.value)"
      placeholder="Поиск по номеру авто или ФИО" 
      class="search-input"
    >
    <button @click="clearSearch" class="clear-search">Очистить</button>
</div>
</template>

<script setup>
const props = defineProps({
    searchQuery: String
})
const emit = defineEmits(['update:searchQuery', 'clear'])

const clearSearch = () => {
    emit('update:searchQuery', '')
    emit('clear')
}
</script>

<style scoped>
.search-section {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.search-input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 14px;
}

.clear-search {
    padding: 10px 20px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}
</style>
