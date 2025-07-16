<script setup>
import ThemeSwitcher from '@/app-insights360/@core/components/ThemeSwitcher.vue';
const themes = [
  {
    name: 'system',
    icon: 'tabler-device-laptop',
  },
  {
    name: 'light',
    icon: 'tabler-sun-high',
  },
  {
    name: 'dark',
    icon: 'tabler-moon',
  },
]
</script>

<template>
  <ThemeSwitcher :themes="themes" />
</template>
