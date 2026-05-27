<template>
  <div id="app">
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.path":class="{ active: $route.path === tab.path }" @click="$router.push(tab.path)">
        {{ tab.label }}
      </button>
    </div>
    <router-view :key="$route.fullPath" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const tabs = [
  { path: '/lots', label: 'Стоянки' } ,
  { path: '/', label: 'Карта парковки' },
  { path: '/clients', label: 'Клиенты' },
  { path: '/history', label: 'Заезды/Выезды' }
  
]
</script>

<style>
.tabs {
  display: flex;
  gap: 4px;
  background: #f0f0f0;
  padding: 10px;
  border-bottom: 1px solid #ccc;
}

.tabs button {
  padding: 10px 20px;
  background: #e0e0e0;
  border: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}

.tabs button.active {
  background: white;
  border-bottom: 2px solid #007bff;
  font-weight: bold;
}
</style>
