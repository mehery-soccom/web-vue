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
  { title: "Agent", key: "agent", searchable: true },
  { title: "Sender", key: "contact.lane", searchable: true },
  { title: "Contact", key: "contact.phone", searchable: true },
  { title: "Status", key: "status", searchable: true },
  { title: "Created", key: "stamps.CRTD", sortable: true },
  { title: "Sent", key: "stamps.SENT", sortable: true },
  { title: "Delivered", key: "stamps.DLVRD", sortable: true },
  { title: "Read", key: "stamps.READ", sortable: true },
];

const fetchCampaignData = async (id) => {
  try {
    const response = await projectStore.fetchOneCampaignOutboundData(id);
    if (response?.data?.data != null) {
      campTable.value = response?.data?.results;
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};

const exportToExcel = () => {
  const formattedData = campTable.value.map((item) => ({
    Agent: item.agent,
    Sender: item.contact.lane,
    Contact: item.contact.phone || item.contact.email,
    Status: item.status,
    Created: formatTimestamp(item.stamps.CRTD),
    Sent: formatTimestamp(item.stamps.SENT),
    Delivered: formatTimestamp(item.stamps.DLVRD),
    Read: formatTimestamp(item.stamps.READ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const fileName = `Campaign-Stats.xlsx`.replaceAll(" ", "-");
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
  console.log("id hai", id);
  fetchCampaignData(id);
});
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <div class="tabs">
        <RouterLink
          :to="{ name: 'views-cta-id', params: { id: route.params.id } }"
          class="tab"
        >
          CTA Page
        </RouterLink>
        <RouterLink
          :to="{ name: 'views-outbound-id', params: { id: route.params.id } }"
          class="tab active"
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
        :title="'Campaign Statistics'"
      >
        <template #item.contact.lane="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.contact.lane }}</span
          >
        </template>
        <template #item.contact.phone="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.contact.phone || item.value.contact.email }}</span
          >
        </template>
        <template #item.stamps.CRTD="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.value.stamps.CRTD) }}</span
          >
        </template>
        <template #item.stamps.SENT="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.value.stamps.SENT) }}</span
          >
        </template>
        <template #item.stamps.DLVRD="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.value.stamps.DLVRD) }}</span
          >
        </template>
        <template #item.stamps.READ="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.value.stamps.READ) }}</span
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
}
.flatpickr-custom-btn:hover {
  background-color: #ddd;
}
.tabs {
  display: flex;
  border-bottom: 2px solid #ccc;
  width: 300px;
  margin-right: 20px;
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
