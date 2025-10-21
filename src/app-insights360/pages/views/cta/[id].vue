<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import debounce from "lodash/debounce";
import CardStatisticsTransactions from "@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue";

const route = useRoute();
const isLoading = ref(false);
const projectStore = useProjectStore();
const campTable = ref([]);
const headers = [
  { title: "Contact", key: "contact.phone", searchable: true },
  { title: "Button Name", key: "buttonName", searchable: true },
  { title: "Button Code", key: "buttonCode", searchable: true },
  { title: "Recieved at", key: "timestamp", searchable: true },
];
const statsCamp = ref([
  { title: "Total", stats: "0", icon: "tabler-send", color: "info" },
  { title: "Sent", stats: "0", icon: "tabler-send", color: "primary" },
  { title: "Delivered", stats: "0", icon: "tabler-mailbox", color: "info" },
  { title: "Read", stats: "0", icon: "tabler-book", color: "error" },
  { title: "Replied", stats: "0", icon: "tabler-message-reply", color: "success"},
  { title: "Failed", stats: "0", icon: "tabler-exclamation-circle", color: "error" },
  { title: "Bounced", stats: "0", icon: "tabler-message-reply", color: "warning" },
]);
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    buttonName: null,
    buttonCode: null,
  },
});
const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  fetchCampaignData(route.params.id, pagination );
};
const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);
const fetchBlockData = (result, contactType) => {
  if(result){
    statsCamp.value[0].stats = String(result.SENT || 0);
    statsCamp.value[1].stats = String(result.SENT || 0);
    if(contactType == 'EMAIL') statsCamp.value[2].stats = String(result.READ || 0);
    else statsCamp.value[2].stats = String(result.DLVRD || 0);
    statsCamp.value[3].stats = String(result.READ || 0);
    statsCamp.value[4].stats = String(result.RSPND || 0);
    statsCamp.value[5].stats = String(result.FAILD || 0);
    statsCamp.value[6].stats = String(result.BNCD || 0);
  }
}
const fetchCampaignData = async (id, pagination) => {
  isLoading.value = true;
  try {
    const response = await projectStore.fetchOneCampaignData(id, pagination);
    if(response?.data?.pagination) pagination.itemsLength = response.data.pagination.total;
    console.log("sa", pagination.itemsLength, response.data.pagination.total)
    if (response?.data?.data != null) {
      campTable.value = response?.data?.results;
      if(response?.data?.data && response?.data?.data?.stats) fetchBlockData(response.data.data.stats, response.data.data.contactType)
    }
  } catch (error) {
    console.error("analytics error", error);
  }finally{
    isLoading.value = false;
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

// onMounted(async () => {
//   const id = route.params.id;
//   console.log("id cta hai", id);
//   fetchCampaignData(id, pagination);
// });
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
      <CardStatisticsTransactions :statistics="statsCamp" :title="'Campaign Statistics'"/>
    </VCol>
    <VCol cols="12">
      <!-- <DemoDataTableKitchenSink
        :headers="headers"
        :productList="campTable"
        :title="'Campaign CTA'"
      > -->
      <MyDataTable :headers="headers" :items="campTable" :loading="isLoading" 
        :server-side="true" v-bind="pagination" @update:options="onUpdateOptionsDebounced">
        <template #item.contact.phone="{ item }">
          <span>{{ item.raw.contact.phone || item.raw.contact.email || item.raw.contact.name }}</span>
        </template>
        <template #item.timestamp="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.raw.timestamp) }}</span
          >
        </template>
      </MyDataTable>
      <!-- </DemoDataTableKitchenSink> -->
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
