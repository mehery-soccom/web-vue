<script setup>
import Fallback from "./journey/Fallback.vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
  journey: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "update:journey"]);

const form = reactive(JSON.parse(JSON.stringify(props.modelValue)));

watch(
  () => props.modelValue,
  (val) => {
    Object.assign(form, val);
    if (val?.rrule) {
      const rule = val.rrule;
      const hours = val.activeHours || {};
      form.recurringType = !!val.enableActiveWindow;

      if (rule.includes("FREQ=DAILY")) {
        form.schedulePattern = "daily";
        form.startTime = hours.start || null;
        form.endTime = hours.end || null;
      } else if (rule.includes("FREQ=WEEKLY")) {
        form.schedulePattern = "weekly";
        form.scheduleDays = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") || [];
        form.weeklyStartTime = hours.start || null;
        form.weeklyEndTime = hours.end || null;
      } else if (rule.includes("FREQ=MONTHLY") && rule.includes("BYMONTHDAY")) {
        form.schedulePattern = "monthlyDate";
        form.scheduleDate = rule.match(/BYMONTHDAY=(\d+)/)?.[1];
        form.monthlyDateStartTime = hours.start || null;
        form.monthlyDateEndTime = hours.end || null;
      } else if (rule.includes("FREQ=MONTHLY") && rule.includes("BYSETPOS")) {
        form.schedulePattern = "monthlyWeekday";
        const weekMap = { 1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH", "-1": "LAST" };
        form.scheduleWeek = weekMap[rule.match(/BYSETPOS=(-?\d+)/)?.[1]];
        form.scheduleWeekday = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") || [];
        form.monthlyWeekdayStartTime = hours.start || null;
        form.monthlyWeekdayEndTime = hours.end || null;
      }
    }
  },
  { deep: true, immediate: true }
);

watch(form, (val) => emit("update:modelValue", val), { deep: true });

const journeyRef = ref(null);

const now = new Date();
const minTime = `${now.getHours()}:${now.getMinutes()}`;

const errors = ref({});

const clearError = (field) => {
  if (errors.value[field]) delete errors.value[field];
};

const summary = computed(() => ({
  duration:
    (form.durationType === "ALWAYS" || form.durationType === "manual")
      ? "Campaign will run until it is manually ended."
      : (form.durationType === "DATE_RANGE"  || form.durationType === "specific")
      ? `Campaign runs from ${form.startDate || "?"} to ${form.endDate || "?"}.`
      : form.durationType === "days"
      ? `Campaign runs on ${form.days || "selected days"}.`
      : "",
  repeat:
    form.repeatType === "once"
      ? "Each user will see the campaign only once."
      : form.repeatType === "repeat"
      ? `Each user will see the campaign up to ${
          form.repeatCount || "?"
        } time(s).`
      : form.repeatType === "afterDays"
      ? `Each user will see the campaign again after ${
          form.repeatAfterDays || "?"
        } day(s).`
      : "",
  delivery: form.ignoreLimit
    ? "Global impression limits will be ignored for this campaign."
    : "Global impression limits will be applied to this campaign.",
}));

const startPickerRef = ref(null);
const endPickerRef = ref(null);
const pad = (n) => String(n).padStart(2, "0");
watch(
  () => form.startDate,
  (start) => {
    const fp = endPickerRef.value?.refFlatPicker?.fp;
    if (!fp) return;
    if (!start) {
      fp.set("minDate", now);
      fp.set("minTime", undefined);
      return;
    }

    const startDate = new Date(start);
    fp.set("minDate", startDate);
    const selectedDate = fp.selectedDates[0];
    const sameDay =
      selectedDate && selectedDate.toDateString() === startDate.toDateString();

    if (sameDay)
      fp.set(
        "minTime",
        `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
      );
    else fp.set("minTime", undefined);
  }
);
watch(
  () => form.endDate,
  (end) => {
    const fp = startPickerRef.value?.refFlatPicker?.fp;
    if (!fp) return;

    if (!end) {
      fp.set("maxDate", undefined);
      fp.set("maxTime", undefined);
      return;
    }

    const endDate = new Date(end);
    fp.set("maxDate", endDate);
    const selectedDate = fp.selectedDates[0];
    const sameDay =
      selectedDate && selectedDate.toDateString() === endDate.toDateString();

    if (sameDay)
      fp.set(
        "maxTime",
        `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
      );
    else fp.set("maxTime", undefined);
  }
);
const Dow = [
  { title: 'Mon', value: 'MO' },
  { title: 'Tues', value: 'TU' },
  { title: 'Wed', value: 'WE' },
  { title: 'Thur', value: 'TH' },
  { title: 'Fri', value: 'FR' },
  { title: 'Sat', value: 'SA' },
  { title: 'Sun', value: 'SU' },
];
const timeValidator = (value, type, label) => {
  if (!form.recurringType) return true;
  if (form.schedulePattern === type && !value) return `${label} is required`;
  return true;
};
const isEndTimeAfterStartTime = (start, end, startLabel = "Start time", endLabel = "End time") => {
  if (!start || !end) return true;

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  if (startTotal >= endTotal) return `${endLabel} must be greater than ${startLabel.toLowerCase()}`;
  return true;
};

const weeklyDaysValidator = (value) => {
  if (form.recurringType && form.schedulePattern === "weekly" && (!value || value.length === 0)) return "Select at least one day";
  return true;
};

const monthlyWeekDaysValidator = (value) => {
  if (form.recurringType && form.schedulePattern === "monthlyWeekday" && (!value || value.length === 0)) return "Select at least one day";
  return true;
};

const dayOfMonthValidator = (value) => {
  if (!value && form.schedulePattern === "monthlyWeekday") return "Week is required";
  return true;
};

const monthlyDateValidator = (value) => {
  if (form.recurringType && form.schedulePattern === "monthlyDate") {
    if ( value === null || value === undefined || value === "") return "Date is required";
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 31) return "Enter valid date (1-31)";
  }
  return true;
};

const formRef = ref();
const isValid = async (silent = false) => {
  const e = {};

  if (form.durationType === "DATE_RANGE") {
    if (!form.startDate) e.startDate = "Start date is required";

    if (!form.endDate) e.endDate = "End date is required";
  }
  if (form.durationType === "days" && !form.days) {
    e.days = "Please enter at least one day";
  }
  if (
    form.repeatType === "repeat" &&
    (!form.repeatCount || form.repeatCount < 1)
  ) {
    e.repeatCount = "Enter a valid repeat count";
  }
  if (
    form.repeatType === "afterDays" &&
    (!form.repeatAfterDays || form.repeatAfterDays < 1)
  ) {
    e.repeatAfterDays = "Enter valid days count";
  }
  if (!!form.recurringType) {
    const validations = {
      daily: [
        ["startTime", timeValidator(form.startTime, "daily", "Start time")],
        ["endTime", timeValidator(form.endTime, "daily", "End time")],
        ["endTimeCompare", isEndTimeAfterStartTime(form.startTime, form.endTime)],
      ],
      weekly: [
        ["scheduleDays", weeklyDaysValidator(form.scheduleDays)],
        ["weeklyStartTime", timeValidator(form.weeklyStartTime, "weekly", "Start time")],
        ["weeklyEndTime", timeValidator(form.weeklyEndTime, "weekly", "End time")],
        ["weeklyEndTimeCompare", isEndTimeAfterStartTime(form.weeklyStartTime, form.weeklyEndTime)],
      ],
      monthlyDate: [
        ["scheduleDate", monthlyDateValidator(form.scheduleDate)],
        ["monthlyDateStartTime", timeValidator(form.monthlyDateStartTime, "monthlyDate", "Start time")],
        ["monthlyDateEndTime", timeValidator(form.monthlyDateEndTime, "monthlyDate", "End time")],
        ["monthlyDateEndTimeCompare", isEndTimeAfterStartTime(form.monthlyDateStartTime, form.monthlyDateEndTime)],
      ],
      // monthlyWeekday: [
      //   ["scheduleWeekday", monthlyWeekDaysValidator(form.scheduleWeekday)],
      //   ["monthlyWeekdayStartTime", timeValidator(form.monthlyWeekdayStartTime, "monthlyWeekday", "Start time")],
      //   ["monthlyWeekdayEndTime", timeValidator(form.monthlyWeekdayEndTime, "monthlyWeekday", "End time")],
      //   ["monthlyWeekdayEndTimeCompare", isEndTimeAfterStartTime(form.monthlyWeekdayStartTime, form.monthlyWeekdayEndTime)],
      // ],
    };
    (validations[form.schedulePattern] || []).forEach(
      ([field, result]) => {
        if (result !== true) {
          e[field] = result;
        }
      }
    );
  }

  if (!silent) errors.value = e;

  let result = { valid: true };
  if (form.recurringType) result = await formRef.value?.validate();
  const journeyValid = props.journey.enabled
    ? await journeyRef.value?.isValid(silent)
    : true;

  if(!!form.recurringType) return Object.keys(e).length === 0 && journeyValid;
  else return Object.keys(e).length === 0 && journeyValid && result?.valid;
};

defineExpose({ isValid });
</script>

<template>
  <VCard class="pa-6 schedule">
    <!-- Summary Section -->
    <template v-if="false">
      <h3 class="mb-2">Summary</h3>
      <ul class="text-caption text-grey-darken-1 pl-4 mb-6">
        <li>{{ summary.duration }}</li>
        <li>{{ summary.repeat }}</li>
        <li>{{ summary.delivery }}</li>
      </ul>

      <VDivider class="mb-6" />
    </template>

    <!-- Campaign Duration -->
    <h3 class="mb-2">Campaign Duration</h3>
    <p class="text-caption mb-4">
      Choose how long the campaign will remain active
    </p>
    <VRadioGroup v-model="form.durationType" hide-details :disabled="props.readonly">
      <VRadio value="ALWAYS">
        <template #label>
          <span>Till the campaign is manually ended</span>
        </template>
      </VRadio>

      <VRadio value="DATE_RANGE">
        <template #label>
          <div class="d-flex flex-column gap-2">
            <div class="d-flex flex-wrap align-center gap-2">
              <span>At specific date/time</span>
              <AppDateTimePicker
                ref="startPickerRef"
                :key="form.durationType + props.readonly + '1'"
                v-model="form.startDate"
                placeholder="Select Date"
                class="flex-grow-1 tiny-input"
                style="min-width: 170px"
                :error="!!errors.startDate"
                @update:modelValue="clearError('startDate')"
                :disabled="form.durationType !== 'DATE_RANGE'"
                :config="{ enableTime: true, minDate: props.readonly ? null : now, time_24hr: true, }"
              />
              <span>ending on</span>
              <AppDateTimePicker
                ref="endPickerRef"
                :key="form.durationType + props.readonly + '2'"
                v-model="form.endDate"
                placeholder="Select Date"
                class="flex-grow-1 tiny-input"
                style="min-width: 170px"
                :error="!!errors.endDate"
                @update:modelValue="clearError('endDate')"
                :disabled="form.durationType !== 'DATE_RANGE'"
                :config="{ enableTime: true, minDate: props.readonly ? null : now, time_24hr: true, }"
              />
            </div>
          </div>
        </template>
      </VRadio>
    </VRadioGroup>
    <div style="display: flex;margin-top: 6px;">
      <VSwitch
        v-model="form.recurringType"
        hide-details
        inset
        color="primary"
        class="mr-2" :disabled="props.readonly"
      />
      <span>Engagement Window</span>
    </div>

    <template v-if="!!form.recurringType || !!form.enableActiveWindow">
      <VForm ref="formRef">
      <div>
        <VDivider class="my-6" />

        <h3 class="mb-2">Engagement Window</h3>
        <p class="text-caption mb-4">Choose when the campaign runs</p>
        <div class="recurring-group">
          <VRadioGroup v-model="form.schedulePattern" :disabled="props.readonly">
            <VRadio value="daily">
              <template #label>
                Run Daily from 
                <AppDateTimePicker
                  v-model="form.startTime"
                  :key="form.durationType + '1' + form.recurringType"
                  placeholder="Start Time"
                  class="flex-grow-1 tiny-input ml-2 mr-2 input-uniform"
                  style="min-width:170px"
                  :disabled="!form.recurringType || props.readonly"
                  :rules="[val => timeValidator(val, 'daily', 'Start time'),
                    () => isEndTimeAfterStartTime(form.startTime, form.endTime)]"
                  :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                  @update:modelValue="form.schedulePattern = 'daily'"
                /> To 
                <AppDateTimePicker
                  v-model="form.endTime"
                  :key="form.durationType + '2' + form.recurringType"
                  placeholder="End Time"
                  class="flex-grow-1 tiny-input ml-2 input-uniform"
                  style="min-width:170px"
                  :disabled="!form.recurringType || props.readonly"
                  :rules="[val => timeValidator(val, 'daily', 'End time'),
                    () => isEndTimeAfterStartTime(form.startTime, form.endTime)]"
                  :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                  @update:modelValue="form.schedulePattern = 'daily'"
                />
              </template>
            </VRadio>

            <VRadio value="weekly">
              <template #label>
                <div class="d-flex align-center gap-2 flex-wrap">
                  Run on scheduled days of week
                  <AppSelect
                    v-model="form.scheduleDays"
                    :items="Dow" :disabled="props.readonly"
                    density="compact" multiple placeholder="Week Days"
                    :rules="[weeklyDaysValidator]"
                    style="min-width: 170px; max-width: 500px; width: fit-content;" class="input-uniform dif-height"
                    @update:modelValue="form.schedulePattern = 'weekly'"
                  /> From
                  <AppDateTimePicker
                    v-model="form.weeklyStartTime"
                    :key="form.durationType + '1' + form.recurringType"
                    placeholder="Start Time"
                    class="flex-grow-1 tiny-input input-uniform"
                    style="min-width:170px"
                    :disabled="!form.recurringType || props.readonly"
                    :rules="[val => timeValidator(val,'weekly','Start time'),
                      () => isEndTimeAfterStartTime(form.weeklyStartTime, form.weeklyEndTime)]"
                    :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                    @update:modelValue="form.schedulePattern = 'weekly'"
                  /> To
                  <AppDateTimePicker
                    v-model="form.weeklyEndTime"
                    :key="form.durationType + '2' + form.recurringType"
                    placeholder="End Time"
                    class="flex-grow-1 tiny-input input-uniform"
                    style="min-width:170px"
                    :disabled="!form.recurringType || props.readonly"
                    :rules="[val => timeValidator(val,'weekly','End time'),
                      () => isEndTimeAfterStartTime(form.weeklyStartTime, form.weeklyEndTime)]"
                    :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                    @update:modelValue="form.schedulePattern = 'weekly'"
                  />
                </div>
              </template>
            </VRadio>

            <VRadio value="monthlyDate">
              <template #label>
                <div class="d-flex align-center gap-2 flex-wrap">
                  Run on date of month 
                  <VTextField
                    v-model="form.scheduleDate"
                    type="number" :disabled="props.readonly"
                    density="compact"
                    placeholder="Date"
                    style="width: 157px"
                    :rules="[monthlyDateValidator]"
                    class="input-uniform dif-height date-num"
                    @update:modelValue="form.schedulePattern = 'monthlyDate'"
                  /> From
                  <AppDateTimePicker
                    v-model="form.monthlyDateStartTime"
                    :key="form.durationType + '1' + form.recurringType"
                    placeholder="Start Time"
                    class="flex-grow-1 tiny-input input-uniform"
                    style="min-width:170px"
                    :disabled="!form.recurringType || props.readonly"
                    :rules="[val => timeValidator(val,'monthlyDate','Start time'),
                      () => isEndTimeAfterStartTime(form.monthlyDateStartTime, form.monthlyDateEndTime)]"
                    :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                    @update:modelValue="form.schedulePattern = 'monthlyDate'"
                  /> To
                  <AppDateTimePicker
                    v-model="form.monthlyDateEndTime"
                    :key="form.durationType + '2' + form.recurringType"
                    placeholder="End Time"
                    class="flex-grow-1 tiny-input input-uniform"
                    style="min-width:170px"
                    :disabled="!form.recurringType || props.readonly"
                    :rules="[val => timeValidator(val,'monthlyDate','End time'),
                      () => isEndTimeAfterStartTime(form.monthlyDateStartTime, form.monthlyDateEndTime)]"
                    :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                    @update:modelValue="form.schedulePattern = 'monthlyDate'"
                  />
                </div>
              </template>
            </VRadio>

            <VRadio value="monthlyWeekday">
              <template #label>
                <div class="d-flex align-center gap-2 flex-wrap">
                  Run from
                  <AppSelect
                    v-model="form.scheduleWeek"
                    :items="['FIRST','SECOND','THIRD','FOURTH','LAST']"
                    density="compact" placeholder="Week Number"
                    :rules="[dayOfMonthValidator]" :disabled="props.readonly"
                    style="width:170px" class="input-uniform dif-height"
                    @update:modelValue="form.schedulePattern = 'monthlyWeekday'"
                  />
                  <AppSelect
                    v-model="form.scheduleWeekday"
                    :items="Dow" :disabled="props.readonly"
                    density="compact" multiple placeholder="Week Days"
                    :rules="[monthlyWeekDaysValidator]"
                    style="min-width: 170px; max-width: 500px; width: fit-content;" class="input-uniform dif-height"
                    @update:modelValue="form.schedulePattern = 'monthlyWeekday'"
                  />
                  <AppDateTimePicker
                    v-model="form.monthlyWeekdayStartTime"
                    :key="form.durationType + '1' + form.recurringType"
                    placeholder="Start Time"
                    class="flex-grow-1 tiny-input input-uniform"
                    style="min-width:170px"
                    :disabled="!form.recurringType || props.readonly"
                    :rules="[val => timeValidator(val,'monthlyWeekday','Start time'),
                      () => isEndTimeAfterStartTime(form.monthlyWeekdayStartTime, form.monthlyWeekdayEndTime)]"
                    :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                    @update:modelValue="form.schedulePattern = 'monthlyWeekday'"
                  /> To
                  <AppDateTimePicker
                    v-model="form.monthlyWeekdayEndTime"
                    :key="form.durationType + '2' + form.recurringType"
                    placeholder="End Time"
                    class="flex-grow-1 tiny-input input-uniform"
                    style="min-width:170px"
                    :disabled="!form.recurringType || props.readonly"
                    :rules="[val => timeValidator(val,'monthlyWeekday','End time'),
                      () => isEndTimeAfterStartTime(form.monthlyWeekdayStartTime, form.monthlyWeekdayEndTime)]"
                    :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }"
                    @update:modelValue="form.schedulePattern = 'monthlyWeekday'"
                  />
                </div>
              </template>
            </VRadio>
          </VRadioGroup>
        </div>
      </div>
      </VForm>
    </template>

    <!-- Fallback Journey -->
    <!-- <VDivider class="my-6" />
    <div class="d-flex align-center mb-3">
      <h3>Campaign Fallback Journey</h3>
      <div>
        <VSwitch
          v-model="journey.enabled"
          @update:modelValue="
            (v) => emit('update:journey', { ...journey, enabled: v })
          "
          hide-details
          inset
          color="primary"
          class="ml-2"
        /> -->
        <!-- <VTooltip activator="parent" location="right">
          Configure a fallback communication
        </VTooltip> -->
      <!-- </div>
    </div> -->
    <Fallback
      v-if="journey.enabled"
      :model-value="journey"
      @update:modelValue="(val) => emit('update:journey', val)"
      ref="journeyRef"
    />

    <!-- Repeat Campaign -->
    <template v-if="false">
      <VDivider class="my-6" />
      <h3 class="mb-2">Repeat Campaign</h3>
      <p class="text-caption mb-4">
        Choose how often a user will see this campaign
      </p>
      <VRadioGroup v-model="form.repeatType" hide-details>
        <VRadio value="once">
          <template #label>
            <span>Show campaign to user only once</span>
          </template>
        </VRadio>

        <VRadio value="multiple">
          <template #label>
            <span>Allow user to view campaign repeatedly</span>
          </template>
        </VRadio>

        <VRadio value="repeat">
          <template #label>
            <div class="d-flex flex-wrap align-center gap-2">
              <span>Allow user to view campaign upto</span>
              <VTextField
                v-model="form.repeatCount"
                type="number"
                class="tiny-input"
                style="width: 80px"
                density="compact"
                variant="outlined"
                hide-details
                :error="!!errors.repeatCount"
                :error-messages="errors.repeatCount"
                @update:modelValue="clearError('repeatCount')"
              />
              <span>time(s)</span>
            </div>
          </template>
        </VRadio>

        <VRadio value="afterDays">
          <template #label>
            <div class="d-flex flex-wrap align-center gap-2">
              <span>Allow user to view campaign after</span>
              <VTextField
                v-model="form.repeatAfterDays"
                type="number"
                class="tiny-input"
                style="width: 80px"
                density="compact"
                variant="outlined"
                hide-details
                :error="!!errors.repeatAfterDays"
                :error-messages="errors.repeatAfterDays"
                @update:modelValue="clearError('repeatAfterDays')"
              />
              <span>day(s) after last seen</span>
            </div>
          </template>
        </VRadio>
      </VRadioGroup>
    </template>

    <!-- Delivery Control -->
    <template v-if="false">
      <VDivider class="my-6" />
      <h3 class="mb-2">Delivery Control</h3>
      <p class="text-caption mb-4">
        Choose whether to ignore the global impressions limit for this campaign
      </p>
      <VSwitch
        v-model="form.ignoreLimit"
        label="Ignore campaign impressions limit"
        inset
      />
      <p class="text-caption mt-2 text-red">
        Campaign will not be delivered if global limit has been reached. Current
        global limit: 100 campaigns/week. Go to settings to change.
      </p>
    </template>
  </VCard>
</template>

<style>
.schedule {
  .tiny-input .v-field__input {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 1rem !important;
    min-height: 32px !important; /* instead of ~40px */
  }
  .v-label {
    width: auto !important;
  }
  .v-input--disabled,
  .v-input--disabled .v-field,
  .v-selection-control--disabled {
    opacity: 0.90 !important; 
  }
  .v-input--disabled .v-field__input,
  .v-input--disabled input::placeholder,
  .v-input--disabled input {
    color: rgba(0, 0, 0, 0.60) !important;
    -webkit-text-fill-color: rgba(0, 0, 0, 0.50) !important;
  }
  .v-label,
  .v-input--disabled .v-label,
  .v-selection-control--disabled .v-label {
    color: rgba(0, 0, 0, 0.50) !important;
    opacity: 1 !important;
    -webkit-text-fill-color: rgba(0, 0, 0, 0.50) !important;
  }
  .v-icon,
  .v-selection-control__wrapper {
    color: rgba(0, 0, 0, 0.50) !important;
    opacity: 1 !important;
  }
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
