<script setup>
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";

const libraryStore = useLibraryStore();

const loading = ref(false);
const items = ref([]);

const headers = [
  { title: "Name", key: "label" },
  { title: "Key", key: "key" },
  { title: "Active Version", key: "defaultVersion" },
  { title: "Actions", key: "actions", sortable: false },
];

async function fetchItems() {
  try {
    loading.value = true;
    const res = await libraryStore.readAll();
    items.value = res.data.results;
  } catch (error) {
    console.log("fetchItems error", error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchItems();
});
</script>

<template>
  <div class="p-6 space-y-4">
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <!-- <VBtn
          icon
          @click="() => fetchItems()"
          :loading="loading"
          variant="text"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <VBtn
          prepend-icon="tabler-plus"
          :to="{ name: 'config-library-add-id?' }"
        >
          New Item
        </VBtn> -->
      </div>
    </VCardText>

    <MyDataTable :headers="headers" :items="items" :loading="loading">
      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'config-library-add-id?',
            params: { id: item.raw.key },
            query: { edit: 'versions' },
          }"
        >
          <VIcon icon="mdi-eye" />
          <VTooltip activator="parent">View</VTooltip>
        </IconBtn>
        <IconBtn
          :to="{
            name: 'config-library-add-id?',
            params: { id: item.raw.key },
            query: { edit: 'details' },
          }"
        >
          <VIcon icon="mdi-pencil" />
          <VTooltip activator="parent">Edit</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
  </div>
</template>

<style scoped lang="scss"></style>
