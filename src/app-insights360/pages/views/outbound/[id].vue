<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import debounce from "lodash/debounce";
import CardStatisticsTransactions from "@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue";
import errorList from '@app-insights360/views/dashboards/analytics/MetaErrorCode.json' 
import { toast } from "vue3-toastify";

const route = useRoute();
const isLoading = ref(false);
const projectStore = useProjectStore();
const campTable = ref([]);
const headers = [
  { title: "Contact", key: "contact", searchable: true },
  { title: "By", key: "agent", searchable: true },
  // { title: "Created", key: "stamps.CRTD", sortable: true },
  { title: "Status", key: "status", searchable: true },
  { title: "Error", key: "error" },
  { title: "Sent", key: "stamps.SENT", sortable: true },
  { title: "Delivered", key: "stamps.DLVRD", sortable: true },
  { title: "Read", key: "stamps.READ", sortable: true },
];
const statsCamp = ref([
  { title: "Account", stats: "-", icon: "tabler-phone", color: "secondary" },
  { title: "Total", stats: "0", icon: "tabler-send", color: "info" },
  { title: "Sent", stats: "0", icon: "tabler-send", color: "primary" },
  { title: "Delivered", stats: "0", icon: "tabler-mailbox", color: "info" },
  { title: "Read", stats: "0", icon: "tabler-book", color: "error" },
  { title: "Replied", stats: "0", icon: "tabler-message-reply", color: "success"},
  { title: "Failed", stats: "0", icon: "tabler-exclamation-circle", color: "error" },
  { title: "Bounced", stats: "0", icon: "tabler-message-reply", color: "warning" },
]);
const hovering = ref(null);
let hideTooltipTimer = null;

const startHideTooltipTimer = () => { hideTooltipTimer = setTimeout(() => { hovering.value = null; }, 200); };
const clearHideTooltipTimer = () => {
  if (hideTooltipTimer) {
    clearTimeout(hideTooltipTimer);
    hideTooltipTimer = null;
  }
};
const showTooltip = async (code, event) => {
  const rect = event.target.getBoundingClientRect();
  hovering.value = { code, top: rect.top + window.scrollY, left: rect.left + window.scrollX, event };

  await nextTick();
  const tooltipEl = document.querySelector('.tooltip-block');
  if (tooltipEl) {
    hovering.value.top = rect.top + window.scrollY - tooltipEl.offsetHeight; 
  }
};

const updatePosition = () => {
  if (!hovering.value || !hovering.value.event) return;
  const rect = hovering.value.event.target.getBoundingClientRect();
  const tooltipEl = document.querySelector('.tooltip-block');
  const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 80;
  hovering.value.top = rect.top + window.scrollY - tooltipHeight;
  hovering.value.left = rect.left + window.scrollX;
};

onMounted(() => {
  window.addEventListener('scroll', updatePosition, true);
});
onUnmounted(() => {
  window.removeEventListener('scroll', updatePosition, true);
});

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    contact: null,
    agent: null,
    status: null,
    error: null,
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
const fetchBlockData = (result, contactType, lane) => {
  if (result) {
    statsCamp.value[0].stats = String(lane ?? "-");
    statsCamp.value[1].stats = String(result.SENT || 0);   
    statsCamp.value[2].stats = String(result.SENT || 0);
    if (contactType === 'EMAIL') statsCamp.value[3].stats = String(result.READ || 0);
    else statsCamp.value[3].stats = String(result.DLVRD || 0);
    statsCamp.value[4].stats = String(result.READ || 0);
    statsCamp.value[5].stats = String(result.RSPND || 0);
    statsCamp.value[6].stats = String(result.FAILD || 0);
    statsCamp.value[7].stats = String(result.BNCD || 0);
  }
}

const fetchCampaignData = async (id, pagination) => {
  isLoading.value = true;
  try {
    const response = await projectStore.fetchOneCampaignOutboundData(id, pagination);
    if(response?.data?.pagination) pagination.itemsLength = response.data.pagination.total;
    console.log("sa", pagination.itemsLength, response.data.pagination.total)
    if (response?.data?.data != null) {
      const createdBy = response.data.data.createdBy || '-';

      campTable.value = (response?.data?.results || []).map(item => ({
        ...item,
        agent: item.agent || createdBy
      }));
      if (response?.data?.data && response?.data?.data?.stats) {
        const laneFromResult = response?.data?.results && response.data.results.length
          ? response.data.results[0]?.contact?.lane
          : undefined;
        const lane = laneFromResult ?? response.data.data.lane;
        fetchBlockData(response.data.data.stats, response.data.data.contactType, lane);
      }
    }
  } catch (error) {
    console.error("analytics error", error);
  }finally{
    isLoading.value = false;
  }
};
const getErrorInfo = (code) => {
  return errorList.find(e => e.Code === Number(code))
}
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
      type: 'campaign-reports'
    }
    if(!!val) params.force = true;
    const response = await projectStore.downloadReports(params);
    if(response.data?.data?.status === 'EXISTS') {
      toast.info(
        `<div style="display:flex;flex-direction:column;gap:8px;">
          <div>Report already present.</div>
          <button style="border-radius:4px;border:1px solid #fff;width: 240px;max-height: 40px;display: flex;align-items: center;
            background:#1976d2;color:#fff;cursor:pointer;" onclick="window.downloadFile('${response.data.data.fileLink}','${response.data.data.title}')">
            Download Existing
          </button>
          <button style="border-radius:4px;border:1px solid #fff;width: 240px;max-height: 40px;display: flex;align-items: center;
            background:#1976d2;color:#fff;cursor:pointer;" onclick="window.stillDownloadReport(true)">
            Download Anyway
          </button>
        </div>`,
        { autoClose: false, dangerouslyHTMLString: true }
      )
    } else if(response.data?.data?.status === 'IN_PROGRESS') {
      toast.info(
        `<div style="display:flex;flex-direction:column;gap:8px;">
          <div>Report creation already in progress.</div>
          <button style="border-radius:4px;border:1px solid #fff;width: 240px;max-height: 40px;display: flex;align-items: center;
            background:#1976d2;color:#fff;cursor:pointer;" onclick="window.stillDownloadReport(true)">
            Download Anyway
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
    Contact: item.contact.phone || item.contact.email,
    By: item.agent,
    // Created: formatTimestamp(item.stamps.CRTD),
    Status: item.status,
    Error: item.logs?.[0] || '-',
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
// onMounted(async () => {
//   const id = route.params.id;
//   console.log("id hai", id);
//   fetchCampaignData(id);
// });
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
        @click="downloadReport(false)"
        color="primary"
        style="width: 45px; height: 45px; min-width: 40px;"
        class="pa-0"
        variant="flat"
      >
        <VIcon>mdi-file-download</VIcon>
      </VBtn>
      <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 45px; height: 45px; min-width: 40px; margin-right: 12px"
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
        :title="'Campaign Statistics'"
      > -->
      <MyDataTable :headers="headers" :items="campTable" :loading="isLoading" 
        :server-side="true" v-bind="pagination" @update:options="onUpdateOptionsDebounced">
        <template #item.contact.lane="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.contact.lane }}</span
          >
        </template>
        <template #item.contact="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.contact.phone || item.raw.contact.email || item.raw.contact.name }}</span
          >
        </template>
        <!-- <template #item.stamps.CRTD="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.raw.stamps.CRTD) }}</span
          >
        </template> -->
        <template #item.stamps.SENT="{ item }">
          <span
            style="width: 100%; display: inline-block;"
            >{{ formatTimestamp(item.raw.stamps.SENT) }}</span
          >
        </template>
        <template #item.stamps.DLVRD="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.raw.stamps.DLVRD) }}</span
          >
        </template>
        <template #item.stamps.READ="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatTimestamp(item.raw.stamps.READ) }}</span
          >
        </template>
        <template #item.error="{ item }">
          <span v-if="item.raw.logs && item.raw.logs[0]"
            style="width: 100%; display: inline-block;"
            >{{ item.raw.logs[0] }} 
            <span style="position: relative; display: inline-block; margin-left: 5px; cursor: pointer;"
                  @mouseenter="showTooltip(item.raw.logs[0], $event)" @mouseleave="startHideTooltipTimer">
              <v-icon size="16" color="primary">mdi-information-outline</v-icon>

              <teleport to="body" v-if="hovering && hovering.code === item.raw.logs[0]">
                <div class="tooltip-block" :style="{ top: hovering.top + 'px', left: (hovering.left - 200) + 'px' }"
                  @mouseenter="clearHideTooltipTimer" @mouseleave="startHideTooltipTimer">
                  <div v-if="getErrorInfo(item.raw.logs[0].split(':')[1])">
                    <strong>Code:</strong> {{ getErrorInfo(item.raw.logs[0].split(':')[1]).Code }}<br>
                    <strong>Details:</strong> {{ getErrorInfo(item.raw.logs[0].split(':')[1]).Details }}<br>
                    <strong>Solution:</strong>
                    <span v-html="getErrorInfo(item.raw.logs[0].split(':')[1]).solutions"></span>
                  </div>
                  <div v-else> No details available for this code.</div>
                </div>
              </teleport>
            </span>
          </span>
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
.tooltip-block {
  position: absolute;
  background: white;
  color: black;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  width: 250px;
  z-index: 99999;
  font-size: 12px;
  white-space: normal;
}
</style>
