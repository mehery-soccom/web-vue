<script setup>
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
import DataService from "@/@common/services/DataService";
import * as XLSX from 'xlsx'
const { show } = inject("snackbar");

const route = useRoute();
const router = useRouter();
const channelsStore = useChannelsStore();
const pushNotificationStore = usePushNotificationStore();

const tab = ref("tab-details");
const isLoading = ref(false);
const notification = reactive({
  campaignName: "",
  template: null,
  channel_id: null,
  platforms: null,
});
const filter = reactive({
  type: "group",
  conjunction: "and",
  children: [
    {
      type: "filter",
      filterType: null,
      field: null,
      operator: null,
      value: null,
      freqOperator: null,
      freqCount: null,
      freqPeriod: null,
    },
  ],
});
const ChannelList = ref([]);
const TemplateListSimple = ref([]);
const formRef = ref();
const filterRef = ref(null);
const scheduleFormRef = ref();

const tabErrors = ref({
  "tab-details": false,
  "tab-audience": false,
  "tab-schedule": false,
});

const audienceMode = ref("filter"); // 'filter' | 'excel'
const filterLink = ref(null);
const excelUploading = ref(false);
const excelFileName = ref(null);
const excelFileRef = ref(null);

const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([['profile code']])
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, 'profile_upload_template.xlsx')
}

const onExcelUpload = async (event) => {
  document.activeElement?.blur();
  const file = event.target.files[0];
  if (!file) return;

  excelFileName.value = file.name;
  excelUploading.value = true;
  filterLink.value = null;
  try {
    const formData = new FormData();
    formData.append("docs", file);
    const res = await pushNotificationStore.uploadDoc(formData);
    filterLink.value = res.data.remoteDetails.Location;
    if (!filterLink.value) throw new Error("No URL in response");
  } catch (err) {
    console.error("Excel upload failed", err);
    show({ message: "Failed to upload file. Please try again.", color: "error" });
    filterLink.value = null;
    excelFileName.value = null;
  } finally {
    excelUploading.value = false;
    event.target.value = null;
  }
};
watch(audienceMode, () => {
  filterLink.value = null;
  excelFileName.value = null;
  excelFileRef.value = null;
});
const validateTab = async (tabName, silent = false) => {
  let valid = true;

  switch (tabName) {
    case "tab-details":
      const detailsValidation = await formRef.value?.validate();
      if (!detailsValidation?.valid) valid = false;
      break;

    case "tab-audience":
      if (audienceMode.value === "excel") {
        if (!filterLink.value) {
          valid = false;
          if (!silent) show({ message: "Please upload a profile codes Excel file.", color: "error" });
        }
      } else {
        let filterValid = await filterRef.value?.isValid();
        let filterStructureValid = true;
        try {
          validateFilterStructure(filter, null, true, true, true);
        } catch (error) {
          filterStructureValid = false;
          if (!silent) show({ message: error.message, color: "error" });
        }
        if (!filterValid || !filterStructureValid) valid = false;
      }
      break;

    case "tab-schedule":
      const scheduleValidation = await scheduleFormRef.value?.validate();
      if (!scheduleValidation?.valid) valid = false;
      break;
  }
  if (!silent) tabErrors.value[tabName] = !valid;
  return valid;
};

const validateAllTabs = async (silent = false) => {
  const tabs = ["tab-details", "tab-audience", "tab-schedule" ];
  const results = await Promise.all(tabs.map(tab => validateTab(tab, silent)));
  return results.every(Boolean);
};

const schedule = reactive({
  durationType: "immediate",
  startDate: null,
  endDate: null,
  recurringType: false,
  schedulePattern: 'daily',
  dailyTime: null,
  weeklyTime: null,
  monthlyDateTime: null,
  monthlyWeekdayTime: null,
});
const now = new Date();
const startDateValidator = (value) => {
  if (schedule.durationType === "scheduled" && !value) return "Please select schedule date";
  return true;
};
const endDateValidator = (value) => {
  if (!!schedule.recurringType && !value) return "Please select end date";
  return true;
};

const dayOfMonthValidator = (value) => {
  if (!value && schedule.schedulePattern === "monthlyWeekday") return "Date is required";
  return true;
};
const timeValidator = (value, type) => {
  if (!schedule.recurringType) return true;
  if (schedule.schedulePattern === type && !value) return "Time is required";
  return true;
};

const weeklyDaysValidator = (value) => {
  if ( schedule.recurringType && schedule.schedulePattern === "weekly" && (!value || value.length === 0)) return "Select at least one day";
  return true;
};
const monthlyWeekDaysValidator = (value) => {
  if ( schedule.recurringType && schedule.schedulePattern === "monthlyWeekday" && (!value || value.length === 0)) return "Select at least one day";
  return true;
};

const monthlyDateValidator = (value) => {
  if (schedule.recurringType && schedule.schedulePattern === "monthlyDate") {
    if (value === null || value === undefined || value === "") return "Date is required";
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 31) return "Enter valid date (1-31)";
  }
  return true;
};
const Dow = [
  { title: 'Mon', value: 'MO' },
  { title: 'Tues', value: 'TU' },
  { title: 'Wed', value: 'WE' },
  { title: 'Thur', value: 'TH' },
  { title: 'Fri', value: 'FR' },
  { title: 'Sat', value: 'SA' },
  { title: 'Sun', value: 'SU' },
];
watch(() => schedule.durationType,
  (val) => {
    if (val === "immediate") schedule.startDate = null;
  },
);
const getTimeParts = (time) => {
  if (!time) return ["00", "00"];
  if (time instanceof Date) return [time.getHours(), time.getMinutes()];
  if (typeof time === "string") {
    const [hour, minute] = time.split(":");
    return [hour, minute];
  }
  return ["00", "00"];
};
const buildSchedulePayload = (schedule) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isRecurring = !!schedule.recurringType;
  const type = schedule.durationType;
  const runAt = schedule.startDate ? new Date(schedule.startDate).toISOString() : null;

  let rrule = null;
  if (isRecurring) {
    const [hour, minute] = getTimeParts(schedule[`${schedule.schedulePattern}Time`]);

    switch (schedule.schedulePattern) {
      case "daily":
        rrule = `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
      case "weekly":
        rrule = `FREQ=WEEKLY;BYDAY=${(schedule.scheduleDays || []).join(",")};BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
      case "monthlyDate":
        rrule = `FREQ=MONTHLY;BYMONTHDAY=${schedule.scheduleDate};BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
      case "monthlyWeekday":
        const weekMap = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, LAST: -1 };
        rrule = `FREQ=MONTHLY;BYDAY=${(schedule.scheduleWeekday || []).join(",")};BYSETPOS=${weekMap[schedule.scheduleWeek]};BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
    }
  }

  return {
    type,
    runAt,
    isRecurring,
    timezone,
    ...(isRecurring && { rrule }),
    ...(schedule.endDate && {
      until: new Date(schedule.endDate).toISOString(),
    }),
  };
};

onMounted(async () => {
  let channelsRes = await channelsStore.fetchChannels().catch((error) => error);
  if (channelsRes.results) {
    ChannelList.value = channelsRes.results;
    if (ChannelList.value.length === 1)
      notification.channel_id = ChannelList.value[0].channel_id;
  }

  let templatesRes = await pushNotificationStore
    .fetchTemplates({ page: 1, itemsPerPage: 200, sortBy: [] })
    .catch((error) => error);
  if (templatesRes.data.results)
    TemplateListSimple.value = templatesRes.data.results.filter(
      (t) => t.type === "simple",
    );

  const copy = route.query.copy;
  if (copy) {
    pushNotificationStore
      .fetchCampaign({ id: copy })
      .then((response) => {
        const _notification = response.data.data;
        let template = TemplateListSimple.value.find(
          (t) => t.code === _notification.templateCode,
        );
        Object.assign(notification, {
          ...notification,
          ..._notification,
          channel_id: _notification.channelId,
          platforms: _notification.filters?.platform,
          template: template?._id,
          campaignName: "",
        });
      })
      .catch((error) => {
        console.log(error);
        show({ message: "Something went wrong", color: "error" });
      });
  }
});

const onSendSimple = async () => {
  const valid = await validateAllTabs();
  if (!valid) {
    const firstInvalidTab = Object.keys(tabErrors.value).find(
      (key) => tabErrors.value[key],
    );
    if (firstInvalidTab) tab.value = firstInvalidTab;
    return;
  }

  try {
    isLoading.value = true;

    let template = TemplateListSimple.value.find(
      (t) => t._id === notification.template,
    );

    let pushPayload = {
      campaignName: notification.campaignName,
      to: {
        ...(audienceMode.value === "excel"
          ? { filterLink: filterLink.value }
          : { filter: filter }),
      },
      channelId: notification.channel_id,
      schedule: buildSchedulePayload(schedule),
      template: {
        code: template.code,
        data: template.model?.data,
        lang: "en",
      },
      options: {
        buttons: template.options.buttons,
      },
      type: template.type,
    };

    await pushNotificationStore.createScheduledCampaign(pushPayload);

    show({ message: "Notification sent successfully", color: "success" });
    router.push({ name: "admin-push-notification-campaigns-list" });
  } catch (error) {
    console.error(error);
    show({ message: "Something went wrong. try again", color: "error" });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <v-row>
    <v-col cols="12" md="12">
      <v-card title="Push Notification">
        <VTabs v-model="tab">
          <VTab value="tab-details" :class="{ 'error-tab': tabErrors['tab-details'] }"> Details 
            <VIcon v-if="tabErrors['tab-details']" size="16" color="error" class="ml-1"> mdi-exclamation-thick</VIcon>
          </VTab>
          <VTab value="tab-audience" :class="{ 'error-tab': tabErrors['tab-audience'] }"> Audience 
            <VIcon v-if="tabErrors['tab-audience']" size="16" color="error" class="ml-1"> mdi-exclamation-thick</VIcon>
          </VTab>
          <VTab value="tab-schedule" :class="{ 'error-tab': tabErrors['tab-schedule'] }"> Scheduling 
            <VIcon v-if="tabErrors['tab-schedule']" size="16" color="error" class="ml-1"> mdi-exclamation-thick</VIcon>
          </VTab>
        </VTabs>

        <VForm ref="formRef">
          <VCard flat>
            <VCardText>
              <VWindow v-model="tab" class="disable-tab-transition">
                <VWindowItem value="tab-details">
                  <VRow>
                    <VCol cols="12" md="4">
                      <AppTextField
                        autofocus
                        v-model="notification.campaignName"
                        placeholder="Campaign Name"
                        :rules="[requiredValidator]"
                      />
                    </VCol>

                    <VCol cols="12" md="8"></VCol>

                    <VCol cols="12" md="4">
                      <AppSelect
                        v-model="notification.channel_id"
                        :items="ChannelList"
                        label="Mobile App"
                        placeholder="Select App"
                        item-title="channel_name"
                        item-value="channel_id"
                        clearable
                        :rules="[requiredValidator]"
                      />
                    </VCol>

                    <VCol cols="12" md="4">
                      <AppAutocomplete
                        v-model="notification.template"
                        :items="TemplateListSimple"
                        label="Template"
                        placeholder="Select a template"
                        item-title="code"
                        item-value="_id"
                        clearable
                        :rules="[requiredValidator]"
                      >
                        <template #item="{ props, item }">
                          <v-list-item v-bind="props" class="px-4">
                            <div class="dropdown-option-meta text-caption">
                              ( {{ item.raw.type }} )
                            </div>
                          </v-list-item>
                        </template>
                      </AppAutocomplete>
                    </VCol>
                  </VRow>
                </VWindowItem>

                <VWindowItem value="tab-audience">
                  <h3 class="mb-2">Audience</h3>
                  <p class="text-caption mb-4"> Target users via real-time filters or by uploading a list of profile codes</p>

                  <VBtnToggle
                    v-model="audienceMode"
                    mandatory
                    density="compact"
                    color="primary"
                    divided
                    class="mb-6"
                  >
                    <VBtn value="filter">Real-Time Filter</VBtn>
                    <VBtn value="excel">Upload Profile Codes</VBtn>
                  </VBtnToggle>

                  <div v-if="audienceMode === 'filter'">
                    <FilterBuilder
                      v-model="filter"
                      :ignoreEventfilterType="true"
                      :ignoreEventDatafilterType="true"
                      :ignoreCustomEventfilterType="true"
                      :ignoreCohortfilterType="true"
                      :channelId="notification.channel_id"
                      ref="filterRef"
                    />
                  </div>

                  <div v-else>
                    <VAlert
                      type="info"
                      variant="tonal"
                      class="mb-5"
                      density="compact"
                    >
                      Upload an Excel file containing profile codes to target
                      specific users. Download the template below, fill in the
                      <strong>profile code</strong> column, then upload it.
                    </VAlert>
                    <div class="d-flex align-center gap-3 mb-5">
                      <VChip
                        color="primary"
                        variant="outlined"
                        size="small"
                        label
                      >
                        Step 1
                      </VChip>
                      <span class="text-body-2">Download the Excel template</span>
                      <VBtn
                        size="small"
                        variant="tonal"
                        color="primary"
                        prepend-icon="mdi-download"
                        @click="downloadExcelTemplate"
                      >
                        Download Template
                      </VBtn>
                    </div>

                    <div class="d-flex align-center gap-3 mb-3 flex-wrap">
                      <VChip color="primary" variant="outlined" size="small" label>
                        Step 2
                      </VChip>
                      <span class="text-body-2">Fill in profile codes and upload the file</span>
                      <VFileInput
                        ref="excelFileRef"
                        accept=".xlsx,.xls,.csv"
                        placeholder="Select Excel file"
                        prepend-inner-icon="mdi-microsoft-excel"
                        prepend-icon=""
                        variant="outlined"
                        density="compact"
                        hide-details
                        style="max-width: 420px"
                        :loading="excelUploading"
                        :disabled="excelUploading"
                        @change="onExcelUpload"
                      />
                      <div class="ml-2">
                        <div v-if="excelUploading" class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                          <VProgressCircular size="14" width="2" indeterminate /> Uploading...
                        </div>
                        <VAlert
                          v-else-if="filterLink"
                          type="success"
                          variant="tonal"
                          density="compact"
                          style="max-width: 420px"
                        >
                          File uploaded successfully.
                          <div class="text-caption text-medium-emphasis ml-1">{{ excelFileName }}</div>
                        </VAlert>
                        <VAlert
                          v-else-if="excelFileName && !filterLink"
                          type="error"
                          variant="tonal"
                          density="compact"
                          style="max-width: 380px"
                        >
                          Upload failed. Please try again.
                        </VAlert>
                      </div>
                    </div>
                  </div>
                </VWindowItem>

                <VWindowItem value="tab-schedule">
                  <VForm ref="scheduleFormRef">
                  <h3 class="mb-2">Schedule</h3>
                  <p class="text-caption mb-4">
                    Choose when the campaign will start
                  </p>
                  <VRadioGroup v-model="schedule.durationType" hide-details>
                    <VRadio value="immediate">
                      <template #label>
                        <span>Start campaign now</span>
                      </template>
                    </VRadio>

                    <VRadio value="scheduled">
                      <template #label>
                        <div class="d-flex flex-column gap-2">
                          <div class="d-flex flex-wrap align-center gap-2">
                            <span>Start campaign at scheduled date/time</span>
                            <AppDateTimePicker
                              v-model="schedule.startDate"
                              :key="schedule.durationType + '1'"
                              placeholder="Select Date"
                              class="flex-grow-1 tiny-input"
                              style="min-width: 170px"
                              :disabled="schedule.durationType != 'scheduled'"
                              :config="{ enableTime: true, minDate: now }"
                              :rules="[startDateValidator]"
                            />
                          </div>
                        </div>
                      </template>
                    </VRadio>
                  </VRadioGroup>
                  <div style="display: flex; margin-top: 6px">
                    <VSwitch
                      v-model="schedule.recurringType"
                      hide-details
                      inset
                      color="primary"
                      class="mr-2"
                    />
                    <span>Make it Recurring</span>
                  </div>

                  <div v-if="!!schedule.recurringType">
                    <VDivider class="my-6" />

                    <h3 class="mb-2">Recurring Details</h3>
                    <p class="text-caption mb-4">
                      Choose when the campaign will repeat
                    </p>
                    <div class="recurring-group">
                      <VRadioGroup v-model="schedule.schedulePattern">
                        <VRadio value="daily">
                          <template #label>
                            Repeat Daily at
                            <AppDateTimePicker
                              v-model="schedule.dailyTime"
                              :key="
                                schedule.durationType +
                                '1' +
                                schedule.recurringType
                              "
                              placeholder="Select Time"
                              class="flex-grow-1 tiny-input ml-2 input-uniform"
                              style="min-width: 170px"
                              :disabled="!schedule.recurringType"
                              :config="{
                                enableTime: true,
                                noCalendar: true,
                                dateFormat: 'H:i',
                                time_24hr: true,
                              }"
                              :rules="[val => timeValidator(val, 'daily')]"
                              @update:modelValue="schedule.schedulePattern = 'daily'"
                            />
                          </template>
                        </VRadio>

                        <VRadio value="weekly">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Repeat on day(s) of week
                              <AppSelect
                                v-model="schedule.scheduleDays"
                                :items="Dow"
                                density="compact"
                                multiple
                                placeholder="Week Days"
                                style="min-width: 170px; max-width: 500px; width: fit-content;"
                                class="input-uniform dif-height"
                                :rules="[weeklyDaysValidator]"
                                @update:modelValue="schedule.schedulePattern = 'weekly'"
                              />
                              <AppDateTimePicker
                                v-model="schedule.weeklyTime"
                                :key="
                                  schedule.durationType +
                                  '1' +
                                  schedule.recurringType
                                "
                                placeholder="Select Time"
                                class="flex-grow-1 tiny-input input-uniform"
                                style="min-width: 170px"
                                :disabled="!schedule.recurringType"
                                :config="{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: 'H:i',
                                  time_24hr: true,
                                }"
                                :rules="[val => timeValidator(val, 'weekly')]"
                                @update:modelValue="schedule.schedulePattern = 'weekly'"
                              />
                            </div>
                          </template>
                        </VRadio>

                        <VRadio value="monthlyDate">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Repeat on date of month
                              <VTextField
                                v-model="schedule.scheduleDate"
                                type="number"
                                density="compact"
                                placeholder="Date"
                                style="width: 160px"
                                class="input-uniform dif-height date-num"
                                :rules="[monthlyDateValidator]"
                                @update:modelValue="schedule.schedulePattern = 'monthlyDate'"
                              />
                              <AppDateTimePicker
                                v-model="schedule.monthlyDateTime"
                                :key="
                                  schedule.durationType +
                                  '1' +
                                  schedule.recurringType
                                "
                                placeholder="Select Time"
                                class="flex-grow-1 tiny-input input-uniform"
                                style="min-width: 170px"
                                :disabled="!schedule.recurringType"
                                :config="{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: 'H:i',
                                  time_24hr: true,
                                }"
                                :rules="[val => timeValidator(val, 'monthlyDate')]"
                                @update:modelValue="schedule.schedulePattern = 'monthlyDate'"
                              />
                            </div>
                          </template>
                        </VRadio>

                        <VRadio value="monthlyWeekday">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Repeat on week day of month
                              <AppSelect
                                v-model="schedule.scheduleWeek"
                                :items="[
                                  'FIRST',
                                  'SECOND',
                                  'THIRD',
                                  'FOURTH',
                                  'LAST',
                                ]"
                                density="compact"
                                placeholder="Week Number"
                                style="width: 170px"
                                class="input-uniform dif-height"
                                :rules="[dayOfMonthValidator]"
                                @update:modelValue="schedule.schedulePattern = 'monthlyWeekday'"
                              />
                              <AppSelect
                                v-model="schedule.scheduleWeekday"
                                :items="Dow"
                                density="compact"
                                multiple
                                placeholder="Week Days"
                                style="width: 170px"
                                class="input-uniform dif-height"
                                :rules="[monthlyWeekDaysValidator]"
                                @update:modelValue="schedule.schedulePattern = 'monthlyWeekday'"
                              />
                              <AppDateTimePicker
                                v-model="schedule.monthlyWeekdayTime"
                                :key="
                                  schedule.durationType +
                                  '1' +
                                  schedule.recurringType
                                "
                                placeholder="Select Time"
                                class="flex-grow-1 tiny-input input-uniform"
                                style="min-width: 170px"
                                :disabled="!schedule.recurringType"
                                :config="{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: 'H:i',
                                  time_24hr: true,
                                }"
                                :rules="[val => timeValidator(val, 'monthlyWeekday')]"
                                @update:modelValue="schedule.schedulePattern = 'monthlyWeekday'"
                              />
                            </div>
                          </template>
                        </VRadio>
                      </VRadioGroup>
                    </div>
                    <div class="d-flex flex-wrap align-center gap-2 mt-4">
                        <h3>Campaign will end at</h3>
                        <AppDateTimePicker
                          v-model="schedule.endDate"
                          :key="schedule.durationType + '1'"
                          placeholder="Select Date"
                          class="flex-grow-1 tiny-input"
                          style="min-width: 170px"
                          :config="{ enableTime: true, minDate: now }"
                          :rules="[endDateValidator]"
                        />
                    </div>
                  </div>
                  </VForm>
                </VWindowItem>
              </VWindow>
            </VCardText>

            <VDivider />

            <VCardText class="d-flex gap-4">
              <VBtn
                v-if="tab === 'tab-schedule'"
                @click="onSendSimple"
                :disabled="isLoading"
                >{{ isLoading ? "loading..." : "Launch" }}
              </VBtn>
              <VBtn
                v-if="tab === 'tab-audience'"
                variant="tonal"
                @click="tab = 'tab-schedule'"
                >Next<VIcon end icon="mdi-arrow-right"
              /></VBtn>
              <VBtn
                v-if="tab === 'tab-details'"
                variant="tonal"
                @click="tab = 'tab-audience'"
                >Next<VIcon end icon="mdi-arrow-right"
              /></VBtn>
              <VBtn
                variant="tonal"
                color="secondary"
                :to="{ name: 'admin-push-notification-campaigns-list' }"
              >
                Exit
              </VBtn>
            </VCardText>
          </VCard>
        </VForm>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped lang="scss">
.dropdown-option-meta {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem;
}
</style>
<style scoped>
:deep(.dif-height .v-select .v-field .v-field__input) {
  min-height: 32px !important;
}
:deep(.dif-height .v-select .v-field .v-field__input .v-select__selection) {
  line-height: 18px;
}
:deep(.dif-height .v-input__control .v-field .v-field__field .v-field__input) {
  min-height: 32px !important;
  max-height: 32px;
}
:deep(.date-num .v-input__control .v-field .v-field__field .v-field__input) {
  padding-top: 3px;
}
:deep(.recurring-group .v-radio-group .v-input__control .v-selection-control-group) {
  gap: 5px;
}
</style>