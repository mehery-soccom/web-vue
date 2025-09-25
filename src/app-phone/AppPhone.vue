<script setup>
import { onMounted } from "vue";
// import Phone from "./views/Phone.vue";
import PhoneJssip from "@/app-phone/views/PhoneJssip.vue";
onMounted(() => {
  console.log("App Phone mounted");
});
</script>

<template>
  <PhoneJssip />
  <!-- <Phone /> -->
</template>

<style lang="scss"></style>
