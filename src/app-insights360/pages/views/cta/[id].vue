<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";

const route = useRoute();
const router = useRouter();
const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();
const campTable = ref([]);
const headers = [
  { title: "Contact", key: "contact.phone", searchable: true },
  { title: "Button Name", key: "buttonName", searchable: true },
  { title: "Button Code", key: "buttonCode", searchable: true },
  { title: "Recieved at", key: "timestamp", searchable: true },
];

const fetchCampaignData = async (id) => {
  try {
    const response = await projectStore.fetchOneCampaignData(id);
    if (response?.data?.data != null) {
      campTable.value = response?.data?.results;
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};

const exportToExcel = () => {
  const formattedData = campTable.value.map((item) => ({
    Contact: item.contact.phone,
    "Button Name": item.buttonName,
    "Button Code": item.buttonCode,
    "Recieved @": formatTimestamp(item.timestamp),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const fileName = `Campaign-CTA.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};
function formatTimestamp(ts) {
  const date = new Date(ts);

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2); // Last two digits of year

  if (!ts) return "-";
  return `${hh}:${mm} ${dd}-${mo}-${yy}`;
}

onMounted(async () => {
  const id = route.params.id;
  console.log("id cta hai", id);
  fetchCampaignData(id);
});
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <div class="tabs">
        <RouterLink
          :to="{ name: 'views-cta-id', params: { id: route.params.id } }"
          class="tab active"
        >
          CTA Page
        </RouterLink>
        <RouterLink
          :to="{ name: 'views-outbound-id', params: { id: route.params.id } }"
          class="tab"
        >
          Campaign Stats
        </RouterLink>
      </div>
      <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 40px; height: 40px; min-width: 40px; margin-right: 12px"
        class="pa-0 ml-3"
        variant="flat"
      >
        <VIcon>mdi-download</VIcon>
      </VBtn>
    </div>
    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers"
        :productList="campTable"
        :title="'Campaign CTA'"
      >
        <template #item.contact.phone="{ item }">
          <span>{{ item.raw.contact.phone }}</span>
        </template>
        <template #item.timestamp="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.raw.timestamp) }}</span
          >
        </template>
      </DemoDataTableKitchenSink>
    </VCol>
  </VRow>
</template>

<style>
.v-select {
  max-width: 210px;
  font-size: 0.85rem;
}
.compact-multiselect .v-select__selection {
  flex-wrap: nowrap !important;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  height: 24px; /* Keep it short like one line */
  line-height: 24px;
}
.flatpickr-custom-btn {
  font-size: 12px;
  background: #eee;
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: black;
}
.flatpickr-custom-btn:hover {
  background-color: #ddd;
}
.tabs {
  display: flex;
  border-bottom: 2px solid #ccc;
  width: 300px;
  margin-right: 20px;
  background-color: #eee;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  text-decoration: none;
  color: #333;
  border-bottom: 2px solid transparent;
  font-weight: bold;
}

.tab:hover {
  background-color: #f4f4f4;
}

.tab.active {
  border-bottom: 2px solid rgb(84, 70, 245);
  color: rgb(115, 103, 240);
  background-color: #ddd;
}
</style>
