<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref, onMounted } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const tableData = ref([]);
const isLoading = ref(false);
const isDrawerOpen = ref(false);
const selectedSession = ref({});
const sessionTagsMap = ref({});

const selectedChatType = ref("I"); 
const chatTypeOptions = [
  { title: 'Inbound', value: 'I' },
  { title: 'Outbound', value: 'O' },
  { title: 'All', value: 'All' },
];

const oldDates = ref([]);
const today = new Date();
var tonight = new Date();
tonight.setHours(23, 59, 59, 999);
const formattedToday = today.toLocaleDateString("en-GB").split("/").join("-");
const dateRange = ref(formattedToday);

const headers = [
  { title: "Assigned To", key: "assignedTo", sortable: false },
  { title: "Customer Name", key: "contactName", sortable: true, searchable: true },
  { title: "Customer Number", key: "contactPhone", sortable: true, searchable: true },
  { title: "Channel", key: "contactType", sortable: true, searchable: true },
  { title: "Status", key: "status", sortable: true, searchable: true },
  { title: "Start @", key: "startStamp", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const formatDateForApi = (dateInput) => {
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTimeDay = (val) => {
  if (!val) return '-';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '-';
  // Format: 09:04 pm Tue
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${time} ${day}`;
};

const formatDateOnly = (val) => {
  if (!val) return '-';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

const formatDuration = (ms) => {
  if (!ms && ms !== 0 || ms === 'NA' || isNaN(ms)) return '-';
  const diff = Math.abs(ms) / 1000;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const sec = Math.floor(diff % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const calcDiff = (start, end) => {
  if (!start || !end) return '-';
  return formatDuration(end - start);
};

const getSentimentLabel = (score) => {
  if (score === "NA" || score === null || score === undefined) return '-';
  const numScore = Number(score);
  const map = { 2: "Very Happy", 1: "Happy", 0: "Satisfied", "-1": "Not Happy", "-2": "Disappointed" };
  return map[numScore] || '-';
};

const fetchSessions = async (startMs, endMs) => {
  isLoading.value = true;
  try {
    const startStr = formatDateForApi(startMs);
    const endStr = formatDateForApi(endMs);
    
    const typePayload = selectedChatType.value === 'All' ? null : selectedChatType.value;

    console.log(`Fetching: ${startStr} to ${endStr}, Type: ${typePayload}`);

    const response = await projectStore.fetchChatSessions(startStr, endStr, typePayload);
    
    if (response?.data) {
        const results = response.data.results || response.data || [];

        tableData.value = results.map(item => ({
            ...item,
            
            assignedAgent: item.summaries?.[0]?.assignedToAgent,
            assignedTeam: item.summaries?.[0]?.assignedToDept,
            assignedQueue: item.summaries?.[0]?.assignedToQueue,
            contactName: item.contact?.name || '-',
            contactPhone: item.contact?.phone || item.contact?.mobile || '-',
            contactType: item.contactType,
            status: item.info?.status || 'OPEN',
            startStamp: item.summaries?.[0]?.firstMessageStamp,
            
            resolvedStamp: item.info?.resolved?.stamp || null,
            resolvedBy: item.info?.resolved?.by || '-',
        }));
    }
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    tableData.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onTypeChange = () => {
  const [day, month, year] = dateRange.value.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 998);
  
  fetchSessions(start.getTime(), end.getTime());
};

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 1) {
    oldDates.value = selectedDates;
    
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    
    const endDate = new Date(selectedDates[0]);
    endDate.setHours(23, 59, 59, 998);
    
    fetchSessions(start.getTime(), endDate.getTime());
  }
};

const openSessionDetails = (item) => {
  selectedSession.value = item; 
  isDrawerOpen.value = true;
};

const formatDurationHHMMSS = (ms) => {
  if (!ms && ms !== 0) return '-';
  if (isNaN(ms)) return '-';
  const diff = Math.abs(ms) / 1000;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const sec = Math.floor(diff % 60);
  // Format: 00:08:14
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const exportToExcel = () => {
  const formattedData = tableData.value.map((item) => {
    const endStamp = item.info?.resolved?.stamp || item.info?.closed?.stamp || item.info?.expired?.stamp;
    
    let resolutionTime = '-';
    const firstMsgStamp = item.summaries?.[0]?.firstMessageStamp;
    if (endStamp && firstMsgStamp) {
       resolutionTime = formatDurationHHMMSS(endStamp - firstMsgStamp);
    }

    let closedBy = item.resolvedBy || '-';
    if (item.status === 'EXPIRED') {
        closedBy = 'SYSTEM';
    }

    const row = {
      "Name": item.contactName || '-',
      "Phone": item.contactPhone || '-',
      "Email": item.contact?.email || '-', 
      "Department": item.assignedTeam || '-',
      "Served By": item.assignedAgent || '-',
      "Channel": item.contactType || '-',
      "Start At": item.summaries?.[0]?.firstMessageStamp ? formatTimeDay(item.summaries[0].firstMessageStamp) : '-',
      "First Message Type": item.summaries?.[0]?.firstMessageType || '-',
      "Agent Handover Time": item.summaries?.[0]?.assignedStamp ? formatTimeDay(item.summaries[0].assignedStamp) : '-',
      "LastMessageType": item.summaries?.[0]?.lastMessageType || '-',
      "Last Message At": item.summaries?.[0]?.lastMessageStamp ? formatTimeDay(item.summaries[0].lastMessageStamp) : '-',
      "Status": item.status || '-',
      "SessionId": item.sessionId || '-',
      "Closed by": closedBy,
      "Closedstamp": endStamp ? formatTimeDay(endStamp) : '-',
      "First Reaction Time": item.summaries?.[0]?.firstReactionTime !== "NA" ? formatDurationHHMMSS(item.summaries?.[0]?.firstReactionTime) : '-',
      "Resolution Time": resolutionTime
    };

    const tags = item.info?.sessionTags || [];
    tags.forEach((tagId, index) => {
      const tagDetails = sessionTagsMap.value[tagId];
      if (tagDetails) {
        const colName = `Cat/Tag ${index + 1}`;
        row[colName] = `${tagDetails.category} / ${tagDetails.title}`;
      }
    });

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ChatSessions");
  
  const fileName = `Chat-Summary-${selectedChatType.value}-${dateRange.value}.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};

onMounted(async () => {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [_, tagsResponse] = await Promise.all([
    fetchSessions(start.getTime(), now.getTime()),
    projectStore.fetchSessionTags()
  ]);

  if (tagsResponse?.data?.results) {
    tagsResponse.data.results.forEach(tag => {
      sessionTagsMap.value[tag._id] = { title: tag.title, category: tag.category };
    });
  }
});


</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding-right: 12px;">
      
      <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 40px; height: 40px; min-width: 40px"
        class="pa-0"
        variant="flat"
      >
        <VIcon>mdi-download</VIcon>
      </VBtn>

      <VSelect
        v-model="selectedChatType"
        :items="chatTypeOptions"
        item-title="title"
        item-value="value"
        density="compact"
        variant="outlined"
        hide-details
        style="width: 150px"
        label="Chat Type"
        @update:modelValue="onTypeChange"
      ></VSelect>

      <AppDateTimePicker
        style="width: 250px;"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'single', 
          dateFormat: 'd-m-Y',
          position: 'auto right',
          maxDate: tonight,
          onClose: onDateClosed
        }"
      />
    </div>

    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers"
        :loading="isLoading"
        :productList="tableData"
        :title="'Chat Summary'"
      >
        <template #item.assignedTo="{ item }">
          <span>
            {{ item.raw.assignedAgent }}
            <span v-if="item.raw.assignedTeam" class="text-caption text-medium-emphasis">
              ({{ item.raw.assignedTeam }})
            </span>
            <span v-if="item.raw.assignedQueue" class="text-caption text-medium-emphasis">
              | {{ item.raw.assignedQueue }}
            </span>
          </span>
        </template>

        <template #item.contactType="{ item }">
           <VChip size="small" color="primary" variant="tonal">
             {{ item.raw.contactType }}
           </VChip>
        </template>

        <template #item.status="{ item }">
           <VChip 
             size="small" 
             :color="item.raw.status === 'OPEN' ? 'success' : 'default'"
           >
             {{ item.raw.status }}
           </VChip>
        </template>

        <template #item.startStamp="{ item }">
            <span>{{ formatTimeDay(item.raw.startStamp) }}</span>
        </template>

        <template #item.actions="{ item }">
          <VBtn icon variant="text" color="default" size="small" @click="openSessionDetails(item.raw)">
            <VIcon icon="tabler-eye" />
          </VBtn>
        </template>

      </DemoDataTableKitchenSink>
    </VCol>

    <VNavigationDrawer
      v-model="isDrawerOpen"
      location="right"
      temporary
      width="400"
      class="scrollable-content drawer-rounded"
    >
      <div class="px-4 py-2 border-b d-flex justify-space-between align-center">
        <h3 class="text-h6">Session Details</h3>
        <VBtn icon variant="text" @click="isDrawerOpen = false">
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </div>

      <div v-if="selectedSession.sessionId || selectedSession._id" class="pa-4">
        <VList lines="two" density="compact">
          
          <VListItemSubtitle class="mb-2 text-uppercase text-xs font-weight-bold">Contact Info</VListItemSubtitle>
          
          <div class="mb-4">
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Contact Name:</span>
               <span class="text-body-2 font-weight-medium">{{ selectedSession.contact?.name || '-' }}</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Email ID:</span>
               <span class="text-body-2">-</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Mobile Number:</span>
               <span class="text-body-2">{{ selectedSession.contact?.phone || selectedSession.contact?.mobile || '-' }}</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Contact ID:</span>
               <span class="text-body-2">{{ selectedSession.contact?.contactId || '-' }}</span>
             </div>
          </div>

          <VDivider class="mb-4" />

          <VListItemSubtitle class="mb-2 text-uppercase text-xs font-weight-bold">Session Info</VListItemSubtitle>
          
          <div class="mb-4">
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Session ID:</span>
               <span class="text-body-2">{{ selectedSession.sessionId }}</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Channel ID:</span>
               <span class="text-body-2">{{ selectedSession.contact?.channelType }}:{{ selectedSession.contact?.lane }}</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Channel Type:</span>
               <span class="text-body-2">{{ selectedSession.contactType }}</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Assigned Agent:</span>
               <span class="text-body-2">{{ selectedSession.summaries?.[0]?.assignedToAgent || '-' }}</span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Closed By:</span>
               <span class="text-body-2">
                 {{ selectedSession.info?.resolved?.by || selectedSession.info?.closed?.by || selectedSession.info?.expired?.by || '-' }}
               </span>
             </div>
          </div>

          <VDivider class="mb-4" />

          <VListItemSubtitle class="mb-2 text-uppercase text-xs font-weight-bold">Metrics</VListItemSubtitle>
          
          <div class="mb-4">
             <div class="d-flex mb-2 align-center">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Chat Start:</span>
               <span class="text-body-2">
                 {{ formatTimeDay(selectedSession.info?.start?.stamp) }} 
                 <span class="text-xs text-disabled">({{ formatDateOnly(selectedSession.info?.start?.stamp) }})</span>
               </span>
             </div>
             <div class="d-flex mb-2 align-center">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Session End:</span>
               <span class="text-body-2">
                 {{ formatTimeDay(selectedSession.info?.resolved?.stamp || selectedSession.info?.closed?.stamp || selectedSession.info?.expired?.stamp) }}
               </span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">First Reply:</span>
               <span class="text-body-2">
                 {{ selectedSession.summaries?.[0]?.firstReactionTime ? formatDuration(selectedSession.summaries[0].firstReactionTime) : '-' }}
               </span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Resolution Time:</span>
               <span class="text-body-2">
                 {{ calcDiff(selectedSession.info?.start?.stamp, (selectedSession.info?.resolved?.stamp || selectedSession.info?.closed?.stamp)) }}
               </span>
             </div>
             <div class="d-flex mb-2">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Feedback Score:</span>
               <span class="text-body-2">{{ selectedSession.info?.satisfactionScore|| '-' }}</span>
             </div>
             <div class="d-flex mb-2 align-center">
               <span class="text-caption text-medium-emphasis me-2" style="min-width: 110px;">Sentiment:</span>
               <div class="text-body-2">
                 <VChip 
                  v-if="selectedSession.aiSentimentScore !== 'NA'" 
                  size="x-small" 
                  :color="Number(selectedSession.aiSentimentScore) >= 0 ? 'success' : 'error'" 
                >
                  {{ getSentimentLabel(selectedSession.aiSentimentScore) }}
                </VChip>
                <span v-else>-</span>
               </div>
             </div>
          </div>

        </VList>
      </div>
      <div v-else class="pa-4 text-center text-medium-emphasis">
        No details available.
      </div>
    </VNavigationDrawer>
  </VRow>
</template>

<style scoped>
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
.drawer-rounded {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  overflow: hidden;
}
</style>