<script setup>
import { onMounted } from "vue";
import { RouterView } from "vue-router";

onMounted(() => {
  console.log("App Offsite mounted");
});
</script>

<template>
  <div>hello offsite</div>
  <RouterView />
</template>

<style lang="scss"></style>
