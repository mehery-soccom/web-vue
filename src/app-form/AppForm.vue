<script setup>
import { onMounted } from "vue";

onMounted(() => {
  console.log("App Form Layout mounted");
});
</script>

<template>
  <VApp>
    <RouterView/>
  </VApp>
</template>

