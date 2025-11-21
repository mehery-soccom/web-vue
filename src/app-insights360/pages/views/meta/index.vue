<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();
const tempTable = ref([]);
const headers = [
  { title: "", key: "data-table-expand", sortable: false, width: "25px" },
  { title: "Template", key: "templateName", searchable: true, width: '140px' },
  { title: "Sent", key: "totalSent", sortable: true },
  { title: "Delivered", key: "totalDelivered", sortable: true },
  { title: "Read", key: "totalRead", sortable: true },
  { title: "Replied", key: "totalReplied", sortable: true },
  { title: "Clicked Count", key: "clickedCount", sortable: true },
  { title: "Total Cost", key: "totalCost", sortable: true },
];
const exportToExcel = () => {
  const formattedData = tempTable.value.map((item) => {
    const base = {
      Template: item.templateName,
      Sent: item.totalSent,
      Delivered: item.totalDelivered,
      Read: item.totalRead,
      Replied: item.totalReplied,
      "Clicked Count": item.clickedCount,
      "Total Cost": item.totalCost,
    };

    const clicks = {};
    if (item.clicks && Object.keys(item.clicks).length) {
      Object.entries(item.clicks).forEach(([key, val]) => {
        clicks[`Click - ${key}`] = val;
      });
    }

    const costs = {};
    if (item.costs && Object.keys(item.costs).length) {
      Object.entries(item.costs).forEach(([key, val]) => {
        const formattedKey = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()); 
        costs[formattedKey] = Number(val ?? 0).toFixed(2);
      });
    }

    return {
      ...base,
      ...clicks,
      ...costs,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const fileName = `Template-data-${dateRange.value}.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};


const fetchMetaTemplateData = async(start, end) =>{
  try{
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await projectStore.fetchMetaTemplateDatas(start, end, timezone);
    if(response?.data.results != null){
      tempTable.value = response?.data?.results.map(item => {
        console.log("Raw API Response", response?.data); 
        const clickedCount = Object.values(item.clicks || {}).reduce((sum, val) => sum + val, 0);
        const totalCost = item.costs?.amount_spent || 0;
        return { ...item, clickedCount, totalCost };
      });
      console.log("Meta Template Data", tempTable.value);
    }
  }catch (error) {
    console.error("Error fetching meta template data", error);
  }
}

function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}


const oldDates = ref([]);
const today = new Date();
var oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
const formattedStart = oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dates = `${formattedStart} to ${formattedEnd}`;
var dateRange = ref(dates);

const onDateSelect = (selectedDates, dateStr) => {
  console.log("Selected:", selectedDates, dateStr);
};
const onDateUpdate = (selectedDates, dateStr) => {
  console.log("Updated:", selectedDates, dateStr);
};

const onDateClosed = (selectedDates, dateStr) => {
  console.log("Closed:", selectedDates, toRaw(oldDates.value), dateStr);
  if (selectedDates.length === 2 && toRaw(oldDates.value) != selectedDates) {
    oldDates.value = selectedDates;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 999);
    fetchMetaTemplateData(start.getTime(),endDate.getTime());
  }
};

onMounted(async () => {
  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);
  fetchMetaTemplateData(oneWeekAgo.getTime(), now.getTime());
});
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 40px; height: 40px; min-width: 40px"
        class="pa-0 ml-3"
        variant="flat"
      >
        <VIcon>mdi-download</VIcon>
      </VBtn>
      <AppDateTimePicker
        style="width: 250px; margin-left: auto; margin: 0 12px"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'range',
          dateFormat: 'd-m-Y',
          position: 'auto right',
          onChange: onDateSelect,
          maxDate: 'today',
          onValueUpdate: onDateUpdate,
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />
    </div>
    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers"
        :productList="tempTable"
        :title="'Meta Template Data'"
        :fixed-column="true"
        item-value="templateId"
      >
        <template #item.templateName="{ item }">
          <span style="width:100%;display:inline-block;text-align:left">{{ item.raw.templateName }}</span>
        </template>

        <template #item.totalSent="{ item }">
          <span style="width:100%;display:inline-block;text-align:center">{{ item.raw.totalSent }}</span>
        </template>

        <template #item.totalDelivered="{ item }">
          <span style="width:100%;display:inline-block;text-align:center">{{ item.raw.totalDelivered }}</span>
        </template>

        <template #item.totalRead="{ item }">
          <span style="width:100%;display:inline-block;text-align:center">{{ item.raw.totalRead }}</span>
        </template>

        <template #item.totalReplied="{ item }">
          <span style="width:100%;display:inline-block;text-align:center">{{ item.raw.totalReplied }}</span>
        </template>

        <template #item.clickedCount="{ item }">
          <span style="width:100%;display:inline-block;text-align:center">{{ item.raw.clickedCount }}</span>
        </template>

        <template #item.totalCost="{ item }">
          <span style="width:100%;display:inline-block;text-align:center">{{ Number(item.raw.totalCost ?? 0).toFixed(2) }}</span>
        </template>

        <template #expanded-row="{ item, columns }">
          <tr>
            <td :colspan="columns.length">
              <div style="padding: 12px;">
                <strong>Clicks:</strong>
                <div v-if="item.raw.clicks && Object.keys(item.raw.clicks).length">
                  <ul>
                    <li v-for="(cnt, key) in item.raw.clicks" :key="key">
                      {{ key }} — {{ cnt }}
                    </li>
                  </ul>
                </div>
                <div v-else> No clicks </div>

                <strong style="margin-top:8px; display:block;">Costs:</strong>
                  <div v-if="item.raw.costs && Object.keys(item.raw.costs).length">
                    <ul>
                      <li v-for="(val, key) in item.raw.costs" :key="key">
                        {{ formatKey(key) }} — {{ Number(val ?? 0).toFixed(2) }}
                      </li>
                    </ul>
                  </div>
                  <div v-else>No Costs</div>
              </div>
            </td>
          </tr>
        </template>
      </DemoDataTableKitchenSink>

      <p style="margin-top:8px; font-size: 15px;">
        Data provided by META as of yesterday's end of day.
      </p>
    </VCol>
  </VRow>
</template>

<style>
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
</style>
