<script setup>
const { show } = inject("snackbar");

const isLoading = ref(false);
const items = ref([]);
const headers = [
  {
    title: "Name",
    key: "desc",
  },
  {
    title: "Code",
    key: "code",
  },
  {
    title: "Type",
    key: "type",
  },
  {
    title: "Created",
    key: "createdAt",
  },
  {
    title: "Updated",
    key: "updatedAt",
  },
  {
    title: "",
    key: "actions",
    sortable: false,
  },
];

onMounted(async () => {});
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn icon @click="() => {}" :loading="isLoading" variant="text">
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <!-- 👉 Create -->
        <VBtn
          prepend-icon="tabler-plus"
          :to="{ name: 'admin-app-engagements-templates-add-id?' }"
        >
          Create Template
        </VBtn>
      </div>
    </VCardText>

    <VDivider />
  </VCard>
</template>

<style lang="scss"></style>
