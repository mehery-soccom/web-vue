<script setup>
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
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

const schedule = reactive({
  durationType: "immediate",
  startDate: null,
  endDate: null,
  recurringType: false,

  dailyTime: null,
  weeklyTime: null,
  monthlyDateTime: null,
  monthlyWeekdayTime: null,
});
const now = new Date();
const scheduleDateValidator = value => {
  if (schedule.durationType === "scheduled" && !value) {
    return "Please select schedule date";
  }
  return true;
};
const dayOfMonthValidator = value => {
  if (!value && schedule.schedulePattern === "monthlyDate") {
    return "Date is required";
  }
  const num = Number(value);
  if (isNaN(num) || num < 1 || num > 31) {
    return "Enter valid date(1-31)";
  }
  return true;
};
watch(() => schedule.durationType, val => {
  console.log("dura", val)
  if (val === "immediate") {
    schedule.startDate = null;
  }
});
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
  if(!!schedule.recurringType) schedule.durationType = 'recurring';
  if (schedule.durationType === "immediate") return { type: "immediate" };

  if (schedule.durationType === "scheduled") {
    return {
      type: "scheduled",
      runAt: new Date(schedule.startDate),
    };
  }

  if (schedule.durationType === "recurring") {
    let rule = "";
    const [hour, minute] = getTimeParts(schedule[`${schedule.schedulePattern}Time`]);
    switch (schedule.schedulePattern) {
      case "daily":
        rule = `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
      case "weekly":
        rule = `FREQ=WEEKLY;BYDAY=${(schedule.scheduleDays || []).join(",")};BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
      case "monthlyDate":
        rule = `FREQ=MONTHLY;BYMONTHDAY=${schedule.scheduleDate};BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
      case "monthlyWeekday":
        const weekMap = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, LAST: -1,};
        rule = `FREQ=MONTHLY;BYDAY=${(schedule.scheduleWeekday || []).join(",")};BYSETPOS=${weekMap[schedule.scheduleWeek]};BYHOUR=${hour};BYMINUTE=${minute}`;
        break;
    }

    return {
      type: "recurring",
      rrule: rule,
    };
  }

  return {};
};

onMounted(async () => {
  let channelsRes = await channelsStore.fetchChannels().catch((error) => error);
  // if (channelsRes.results) ChannelList.value = channelsRes.results;
  if (channelsRes.results) {
    ChannelList.value = channelsRes.results;
    if (ChannelList.value.length === 1) notification.channel_id = ChannelList.value[0].channel_id;
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
  let validationResult = await formRef.value.validate();
  if (!validationResult.valid) {
    return;
  }

  let filtervalid = await filterRef.value?.isValid();
  let filterStructureValid = true;
  try {
    validateFilterStructure(filter, null, true, true);
  } catch (error) {
    filterStructureValid = false;
    show({ message: error.message, color: "error" });
  }
  if (!filtervalid || !filterStructureValid) return;

  try {
    isLoading.value = true;

    let template = TemplateListSimple.value.find(
      (t) => t._id === notification.template,
    );

    let campaignPayload = {
      template: {
        code: template.code,
      },
      campaignName: notification.campaignName,
      schedule: buildSchedulePayload(schedule),
    };

    let campaignRes = await pushNotificationStore.createCampaign(
      campaignPayload,
    );

    let pushPayload = {
      campaignId: campaignRes.data.campaignId,
      to: {
        filter: filter,
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

    await pushNotificationStore.push(pushPayload);

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
    <!-- Form Column -->
    <v-col cols="12" md="12">
      <v-card title="Push Notification">
        <VTabs v-model="tab">
          <VTab value="tab-details"> Details </VTab>
          <VTab value="tab-audience"> Audience </VTab>
          <VTab value="tab-schedule"> Scheduling </VTab>
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
                  <h3 class="mb-2">Real-Time Filter</h3>
                  <p class="text-caption mb-4">
                    Apply filters based on latest user attributes
                  </p>
                  <FilterBuilder
                    v-model="filter"
                    :ignoreEventfilterType="true"
                    ref="filterRef"
                  />
                </VWindowItem>

                <VWindowItem value="tab-schedule">
                  <h3 class="mb-2">Campaign Duration</h3>
                  <p class="text-caption mb-4">
                    Choose when the campaign will run
                  </p>
                  <VRadioGroup v-model="schedule.durationType" hide-details>
                    <VRadio value="immediate">
                      <template #label>
                        <span>Run campaign now</span>
                      </template>
                    </VRadio>

                    <VRadio value="scheduled">
                      <template #label>
                        <div class="d-flex flex-column gap-2">
                          <div class="d-flex flex-wrap align-center gap-2">
                            <span>Run campaign at scheduled date/time</span>
                            <AppDateTimePicker
                              v-model="schedule.startDate"
                              :key="schedule.durationType + '1'"
                              placeholder="Select Date"
                              class="flex-grow-1 tiny-input"
                              style="min-width:170px"
                              :disabled="schedule.durationType != 'scheduled'"
                              :config="{ enableTime: true, minDate: now }"
                              :rules="[scheduleDateValidator]"
                            />
                          </div>
                        </div>
                      </template>
                    </VRadio>
                  </VRadioGroup>
                  <div style="display: flex;margin-top: 6px;">
                    <VSwitch
                      v-model="schedule.recurringType"
                      hide-details
                      inset
                      color="primary"
                      class="mr-2"
                    />
                    <!-- <VTooltip activator="parent" location="bottom">
                      Make the campaign recurring
                    </VTooltip> -->
                    <span>Recurring</span>
                  </div>

                  <div v-if="!!schedule.recurringType">
                    <VDivider class="my-6" />

                    <h3 class="mb-2">Recurring Campaign</h3>
                    <p class="text-caption mb-4">Choose when the campaign repeats</p>
                    <div class="recurring-group">

                      <VRadioGroup v-model="schedule.schedulePattern">

                        <VRadio value="daily">
                          <template #label>
                            Run Daily at 
                            <AppDateTimePicker
                              v-model="schedule.dailyTime"
                              :key="schedule.durationType + '1' + schedule.recurringType"
                              placeholder="Select Time"
                              class="flex-grow-1 tiny-input ml-2 input-uniform"
                              style="min-width:170px"
                              :disabled="!schedule.recurringType"
                              :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true }"
                            />
                          </template>
                        </VRadio>

                        <VRadio value="weekly">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Run on scheduled days of week
                              <!-- <div class="d-flex align-center gap-2 flex-wrap"> -->
                                <AppSelect
                                  v-model="schedule.scheduleDays"
                                  :items="['MON','TUE','WED','THU','FRI','SAT','SUN']"
                                  density="compact" multiple placeholder="Week Days"
                                  style="width:170px" class="input-uniform dif-height"
                                />
                                <AppDateTimePicker
                                  v-model="schedule.weeklyTime"
                                  :key="schedule.durationType + '1' + schedule.recurringType"
                                  placeholder="Select Time"
                                  class="flex-grow-1 tiny-input input-uniform"
                                  style="min-width:170px"
                                  :disabled="!schedule.recurringType"
                                  :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true }"
                                />
                              <!-- </div> -->
                            </div>
                          </template>
                        </VRadio>

                        <VRadio value="monthlyDate">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Run on date of month
                              <VTextField
                                v-model="schedule.scheduleDate"
                                type="number" :rules="[dayOfMonthValidator]"
                                density="compact" placeholder="Date" 
                                style="width:157px" class="input-uniform dif-height"
                              />
                              <AppDateTimePicker
                                v-model="schedule.monthlyDateTime"
                                :key="schedule.durationType + '1' + schedule.recurringType"
                                placeholder="Select Time"
                                class="flex-grow-1 tiny-input input-uniform"
                                style="min-width:170px"
                                :disabled="!schedule.recurringType"
                                :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true }"
                              />
                            </div>
                          </template>
                        </VRadio>

                        <VRadio value="monthlyWeekday">
                          <template #label>
                            <div class="d-flex align-center gap-2 flex-wrap">
                              Run on
                              <AppSelect
                                v-model="schedule.scheduleWeek"
                                :items="['FIRST','SECOND','THIRD','FOURTH','LAST']"
                                density="compact" placeholder="Week Number"
                                style="width:170px" class="input-uniform dif-height"
                              />
                              <AppSelect
                                v-model="schedule.scheduleWeekday"
                                :items="['MON','TUE','WED','THU','FRI','SAT','SUN']"
                                density="compact" multiple placeholder="Week Days"
                                style="width:170px" class="input-uniform dif-height"
                              />
                              <AppDateTimePicker
                                v-model="schedule.monthlyWeekdayTime"
                                :key="schedule.durationType + '1' + schedule.recurringType"
                                placeholder="Select Time"
                                class="flex-grow-1 tiny-input input-uniform"
                                style="min-width:170px"
                                :disabled="!schedule.recurringType"
                                :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true }"
                              />
                            </div>
                          </template>
                        </VRadio>
                      </VRadioGroup>
                    </div>
                  </div>
                </VWindowItem>
              </VWindow>
            </VCardText>

            <VDivider />

            <VCardText class="d-flex gap-4">
              <VBtn
                v-if="tab === 'tab-schedule'"
                @click="onSendSimple"
                :disabled="isLoading"
                >{{ isLoading ? "loading..." : "Send Campaign" }}
              </VBtn>
              <VBtn
                v-if="tab === 'tab-audience'"
                variant="tonal"
                @click="tab = 'tab-schedule'"
                >Next<VIcon end icon="mdi-arrow-right"
              /></VBtn>
              <!-- <VBtn
                v-if="tab === 'tab-audience'"
                @click="onSendSimple"
                :disabled="isLoading"
                >{{ isLoading ? "loading..." : "Send Campaign" }}</VBtn
              > -->
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
  padding-top: 3px;
}
</style>