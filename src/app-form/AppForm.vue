<script setup>
import { onMounted } from "vue";

import LeadForm from "@/app-form/pages/LeadForm.vue"; 

onMounted(() => {
  console.log("App Form mounted");
});
</script>

<template>
  <VApp>
    <VMain>
      <VContainer>
        <LeadForm />
      </VContainer>
    </VMain>
  </VApp>
</template>

<style lang="scss">
/* Keep this blank or add your minimal styles */
</style>