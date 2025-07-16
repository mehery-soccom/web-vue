<script setup>
const isLoading = ref(false);
const notifications = ref([]);
const headers = [
  { title: "", key: "data-table-expand" },
  {
    title: "Name",
    key: "campaignName",
  },
  {
    title: "Template",
    key: "templateCode",
  },
  {
    title: "Status",
    key: "status",
  },
  {
    title: "Start",
    key: "createdStamp",
  },
  {
    title: "Total",
    key: "messageCount",
    sortable: false,
  },
  {
    title: "Sent",
    key: "stats.sent",
    sortable: false,
  },
  {
    title: "Failed",
    key: "stats.failed",
    sortable: false,
  },
  {
    title: "",
    key: "actions",
    sortable: false,
  },
];
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    campaignName: "",
    templateCode: "",
  },
});

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
          New Notification
        </VBtn>
      </div>
    </VCardText>

    <VDivider />
  </VCard>
</template>

<style lang="scss"></style>
