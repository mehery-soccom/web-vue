<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import debounce from "lodash/debounce";
import CardStatisticsTransactions from "@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue";
import { toast } from "vue3-toastify";

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
const statsCamp = ref([]);
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
      campTable.value = response?.data?.results || [];
      
      const summary = response?.data?.data?.campaignSummary;
      const newStats = [];
      const defaultColors = ["primary", "success", "info"];
      
      if (summary && Object.keys(summary).length > 0) {
        let index = 0;
        for (const [key, value] of Object.entries(summary)) {
          newStats.push({
            title: key,
            stats: String(value),
            icon: "tabler-click",
            color: defaultColors[index % defaultColors.length]
          });
          index++;
        }
      } else {
        newStats.push({ title: "No Data", stats: "0", icon: "tabler-circle-minus", color: "secondary" });
      }
      
      statsCamp.value = newStats;
    }
  } catch (error) {
    console.error("analytics error", error);
  } finally {
    isLoading.value = false;
  }
};
window.stillDownloadReport = async (val) => {
  toast.clearAll()
  await downloadReport(val)
}
window.downloadFile = (url, name) => {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadReport = async (val=false) => {
  isLoading.value = true;
  try {
    let params = {
      meta: { bulkSessionId: route.params.id },
      type: 'campaign-cta',
      agentCode: window.CONST.APP_USER,
    }
    if(!!val) params.force = true;
    const response = await projectStore.downloadReports(params);
    if(response.data?.data?.status === 'EXISTS') {
      const createdAt = response.data?.data?.doc?.createdAt;
      let formattedDateTime = '-';
      if(!!createdAt) { formattedDateTime = new Date(createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
      toast.info(
        `<div style="display:flex;flex-direction:column;gap:8px;">
          <div>Report created for date range on ${formattedDateTime}. Available in Report Tab.</div>
          <div>Create fresh report if more campaigns have been run after this report was generated.</div>
          <button style="border-radius:4px;border:1px solid #fff;width: 240px;max-height: 40px;padding-left: 30px;display: flex;align-items: center;
            background:#1976d2;color:#fff;cursor:pointer;" onclick="window.stillDownloadReport(true)">
            Download
          </button>
        </div>`,
        { autoClose: false, dangerouslyHTMLString: true }
      )
    } else if(response.data?.data?.status === 'IN_PROGRESS') {
      const createdAt = response.data?.data?.doc?.createdAt;
      let formattedDateTime = '-';
      if(!!createdAt) { formattedDateTime = new Date(createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
      toast.info(
        `<div style="display:flex;flex-direction:column;gap:8px;">
          <div>Report creation started for date range on ${formattedDateTime}. Will appear in the Reports tab shortly.</div>
          <div>Create fresh report if more campaigns have been run after this report was generated.</div>
          <button style="border-radius:4px;border:1px solid #fff;width: 240px;max-height: 40px;padding-left: 30px;display: flex;align-items: center;
            background:#1976d2;color:#fff;cursor:pointer;" onclick="window.stillDownloadReport(true)">
            Download
          </button>
        </div>`,
        { autoClose: false, dangerouslyHTMLString: true }
      )
    } else {
      toast.success('Download Started, Please check after some time.')
    }
  } catch (error) {
    console.error("report error", error);
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
      <VTooltip text="Download customer messaging info across the campaign">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            @click="downloadReport(false)"
            color="primary"
            style="width: 45px; height: 45px; min-width: 40px; margin-right: 12px"
            class="pa-0"
            variant="flat"
          >
            <VIcon>mdi-file-download</VIcon>
          </VBtn>
        </template>
      </VTooltip>
      <!-- <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 40px; height: 40px; min-width: 40px; margin-right: 12px"
        class="pa-0 ml-3"
        variant="flat"
      >
        <VIcon>mdi-download</VIcon>
      </VBtn> -->
    </div>
    <VCol cols="12">
      <CardStatisticsTransactions :statistics="statsCamp" :title="'CTA Statistics'"/>
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
          <span>{{ item.raw.contact.phone || item.raw.contact.email || item.raw.contact.name || item.raw.contact.csid }}</span>
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
