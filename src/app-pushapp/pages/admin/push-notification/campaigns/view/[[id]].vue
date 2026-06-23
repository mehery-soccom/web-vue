<script setup>
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
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

const tabErrors = ref({
  "tab-details": false,
  "tab-audience": false,
  "tab-schedule": false,
});

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
const Dow = [
  { title: 'Mon', value: 'MO' },
  { title: 'Tues', value: 'TU' },
  { title: 'Wed', value: 'WE' },
  { title: 'Thur', value: 'TH' },
  { title: 'Fri', value: 'FR' },
  { title: 'Sat', value: 'SA' },
  { title: 'Sun', value: 'SU' },
];

const getTimeParts = (time) => {
  if (!time) return ["00", "00"];
  if (time instanceof Date) return [time.getHours(), time.getMinutes()];
  if (typeof time === "string") {
    const [hour, minute] = time.split(":");
    return [hour, minute];
  }
  return ["00", "00"];
};

const campaignId = route.params.id;

onMounted(async () => {
  try {
    const channelsRes = await channelsStore.fetchChannels();
    ChannelList.value = channelsRes.results || [];

    const templatesRes = await pushNotificationStore.fetchTemplates({
      page: 1,
      itemsPerPage: 200,
      sortBy: [],
    });

    TemplateListSimple.value =
      templatesRes.data.results.filter(t => t.type === "simple");

    const response = await pushNotificationStore.fetchCampaign({
      id: campaignId,
    });

    const campaign = response.data.data;

    const template = TemplateListSimple.value.find(
      t => t.code === campaign.templateCode,
    );

    Object.assign(notification, {
      campaignName: campaign.campaignName,
      channel_id: campaign.channelId,
      template: template?._id,
    });

    if (campaign.filter) {
      Object.assign(filter, campaign.filter);
    }

    if (campaign.schedule) {
      populateSchedule(campaign.schedule);
    }
  } catch (error) {
    console.error(error);
    show({
      message: "Failed to load campaign",
      color: "error",
    });
  }
});

const populateSchedule = scheduleData => {
  schedule.durationType = scheduleData.type === "scheduled" ? "scheduled" : "immediate";
  schedule.startDate = scheduleData.runAt || null;
  schedule.endDate = scheduleData.until || null;
  schedule.recurringType = !!scheduleData.isRecurring;

  if (!scheduleData.rrule) return;
  const rule = scheduleData.rrule;

  if (rule.includes("FREQ=DAILY")) {
    schedule.schedulePattern = "daily";

    const hour = rule.match(/BYHOUR=(\d+)/)?.[1];
    const minute = rule.match(/BYMINUTE=(\d+)/)?.[1];

    schedule.dailyTime = `${hour}:${minute}`;
  }

  if (rule.includes("FREQ=WEEKLY")) {
    schedule.schedulePattern = "weekly";
    schedule.scheduleDays = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") || [];

    const hour = rule.match(/BYHOUR=(\d+)/)?.[1];
    const minute = rule.match(/BYMINUTE=(\d+)/)?.[1];

    schedule.weeklyTime = `${hour}:${minute}`;
  }

  if (rule.includes("FREQ=MONTHLY") && rule.includes("BYMONTHDAY")) {
    schedule.schedulePattern = "monthlyDate";
    schedule.scheduleDate = rule.match(/BYMONTHDAY=(\d+)/)?.[1];

    const hour = rule.match(/BYHOUR=(\d+)/)?.[1];
    const minute = rule.match(/BYMINUTE=(\d+)/)?.[1];

    schedule.monthlyDateTime = `${hour}:${minute}`;
  }

  if ( rule.includes("FREQ=MONTHLY") && rule.includes("BYSETPOS")) {
    schedule.schedulePattern = "monthlyWeekday";

    const weekMap = { 1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH", "-1": "LAST"};

    schedule.scheduleWeek = weekMap[rule.match(/BYSETPOS=(-?\d+)/)?.[1]];
    schedule.scheduleWeekday = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") || [];

    const hour = rule.match(/BYHOUR=(\d+)/)?.[1];
    const minute = rule.match(/BYMINUTE=(\d+)/)?.[1];

    schedule.monthlyWeekdayTime = `${hour}:${minute}`;
  }
};
</script>

<template>
  <v-row>
    <!-- Form Column -->
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
                        autofocus disabled
                        v-model="notification.campaignName"
                        placeholder="Campaign Name"
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
                        clearable disabled
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
                        clearable disabled
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
                  <h3 class="mb-2">Real-Time Filter</h3>
                  <p class="text-caption mb-4">
                    Apply filters based on latest user attributes
                  </p>
                  <FilterBuilder
                    v-model="filter" readonly
                    :ignoreEventfilterType="true"
                    :ignoreCustomEventfilterType="true"
                    :ignoreCohortfilterType="true"
                    :channelId="notification.channel_id"
                    ref="filterRef"
                  />
                </VWindowItem>

                <VWindowItem value="tab-schedule">
                  <VForm ref="scheduleFormRef" class="scheduling-panel-wrapper">
                  <h3 class="mb-2">Schedule</h3>
                  <p class="text-caption mb-4">
                    Choose when the campaign will start
                  </p>
                  <VRadioGroup v-model="schedule.durationType" hide-details disabled>
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
                      class="mr-2" disabled
                    />
                    <!-- <VTooltip activator="parent" location="bottom">
                      Make the campaign recurring
                    </VTooltip> -->
                    <span>Make it Recurring</span>
                  </div>

                  <div v-if="!!schedule.recurringType">
                    <VDivider class="my-6" />

                    <h3 class="mb-2">Recurring Details</h3>
                    <p class="text-caption mb-4">
                      Choose when the campaign will repeat
                    </p>
                    <div class="recurring-group">
                      <VRadioGroup v-model="schedule.schedulePattern" disabled>
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
                              :config="{
                                enableTime: true,
                                noCalendar: true,
                                dateFormat: 'H:i',
                                time_24hr: true,
                              }"
                              @update:modelValue="schedule.schedulePattern = 'daily'" disabled
                            />
                          </template>
                        </VRadio>

                        <VRadio value="weekly">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Repeat on day(s) of week
                              <!-- <div class="d-flex align-center gap-2 flex-wrap"> -->
                              <AppSelect
                                v-model="schedule.scheduleDays"
                                :items="Dow"
                                density="compact"
                                multiple
                                placeholder="Week Days"
                                style="min-width: 170px; max-width: 500px; width: fit-content;"
                                class="input-uniform dif-height"
                                @update:modelValue="schedule.schedulePattern = 'weekly'" disabled
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
                                :config="{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: 'H:i',
                                  time_24hr: true,
                                }"
                                @update:modelValue="schedule.schedulePattern = 'weekly'" disabled
                              />
                              <!-- </div> -->
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
                                @update:modelValue="schedule.schedulePattern = 'monthlyDate'" disabled
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

                                :config="{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: 'H:i',
                                  time_24hr: true,
                                }"
                                @update:modelValue="schedule.schedulePattern = 'monthlyDate'" disabled
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
                                @update:modelValue="schedule.schedulePattern = 'monthlyWeekday'" disabled
                              />
                              <AppSelect
                                v-model="schedule.scheduleWeekday"
                                :items="Dow"
                                density="compact"
                                multiple
                                placeholder="Week Days"
                                style="width: 170px"
                                class="input-uniform dif-height"
                                @update:modelValue="schedule.schedulePattern = 'monthlyWeekday'" disabled
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
                                :config="{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: 'H:i',
                                  time_24hr: true,
                                }"
                                @update:modelValue="schedule.schedulePattern = 'monthlyWeekday'" disabled
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
                          :config="{ enableTime: true, minDate: now }" disabled
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
:deep(.scheduling-panel-wrapper .v-input--disabled),
:deep(.scheduling-panel-wrapper .v-input--disabled .v-field),
:deep(.scheduling-panel-wrapper .v-selection-control--disabled) {
  opacity: 0.90 !important;
}

:deep(.scheduling-panel-wrapper .v-input--disabled .v-field__input),
:deep(.scheduling-panel-wrapper .v-input--disabled input::placeholder),
:deep(.scheduling-panel-wrapper .v-input--disabled input) {
  color: rgba(0, 0, 0, 0.50) !important;
  -webkit-text-fill-color: rgba(0, 0, 0, 0.50) !important;
}

:deep(.scheduling-panel-wrapper .v-label),
:deep(.scheduling-panel-wrapper .v-input--disabled .v-label){
  color: rgba(0, 0, 0, 0.50) !important;
  opacity: 1 !important;
  -webkit-text-fill-color: rgba(0, 0, 0, 0.50) !important;
}
</style>
