<script setup>
import { onMounted } from "vue";
import { RouterView } from "vue-router";
// import Phone from "./views/Phone.vue";
// import PhoneJssip from "@/app-phone/views/PhoneJssip.vue";
onMounted(() => {
  console.log("App Phone mounted");
});
</script>

<template>
  <RouterView />
  <!-- <PhoneJssip /> -->
  <!-- <Phone /> -->
</template>

<style lang="scss"></style>
