<script setup>
const { show } = inject("snackbar");

const route = useRoute();
const router = useRouter();

const tab = ref("one");
const isLoading = ref(false);

onMounted(async () => {});
</script>

<template>create</template>

<style scoped lang="scss"></style>
