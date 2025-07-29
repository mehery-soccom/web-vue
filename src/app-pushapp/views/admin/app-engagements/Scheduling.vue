<script setup>
onMounted(async () => {});

const isValid = async () => {
  return true;
};

const val = async () => {
  return {
    test: true,
  };
};

defineExpose({ isValid, val });
</script>

<template>
  <div>Scheduling</div>
</template>
