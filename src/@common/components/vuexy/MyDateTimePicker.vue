<script setup>
import { ref, watch, computed, nextTick } from "vue";
import FlatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import { DateTime } from "luxon";

/* ---------------- Props ---------------- */
const props = defineProps({
  modelValue: {
    type: [Array, String, Number, Object, null],
    default: null,
  },

  label: String,
  placeholder: String,

  disabled: Boolean,
  readonly: Boolean,

  clearable: Boolean,

  prependIcon: String,
  appendIcon: String,

  error: Boolean,
  errorMessages: {
    type: [String, Array],
    default: "",
  },
  hint: String,
  persistentHint: Boolean,

  mode: {
    type: String,
    default: "single", // single | range
    validator: (v) => ["single", "range"].includes(v),
  },

  enableTime: Boolean,
  noPastDate: Boolean,
  noFutureDate: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

/* ---------------- Timezone ---------------- */
function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/* ---------------- Format helpers ---------------- */
function toLuxonFormat(format) {
  return format
    .replace(/YYYY/g, "yyyy")
    .replace(/DD/g, "dd")
    .replace(/MM/g, "LL")
    .replace(/HH/g, "HH")
    .replace(/mm/g, "mm");
}

function getDisplayFormat() {
  return props.enableTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";
}

/* ---------------- Parsing ---------------- */
function parseToDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  if (typeof input === "string") {
    const d = new Date(input);
    return isNaN(d) ? null : d;
  }
  if (typeof input === "object") {
    if (input.stampUTC) return new Date(input.stampUTC);
    if (input.dateUTC) return new Date(input.dateUTC);
    if (input.dateLocal && input.format) {
      const dt = DateTime.fromFormat(input.dateLocal, input.format, {
        zone: input.timeZone || getUserTimeZone(),
      });
      return dt.isValid ? dt.toJSDate() : null;
    }
  }
  return null;
}

function normalizeIncomingValue(val) {
  if (!val) return null;
  if (Array.isArray(val)) {
    const dates = val.map(parseToDate).filter(Boolean);
    return props.mode === "range" ? dates.slice(0, 2) : dates[0] ?? null;
  }
  return parseToDate(val);
}

/* ---------------- Internal state ---------------- */
const internalValue = ref(null);
const isProgrammaticUpdate = ref(false); // standard imperative-widget guard - “If I caused this change, ignore it. If the user caused this change, emit it.”

/* ---------------- Emit payload (STRICT contract) ---------------- */
function buildPayload(date) {
  const stampUTC = date.getTime();
  const dateUTC = new Date(stampUTC).toISOString();
  const timeZone = getUserTimeZone();

  const format = getDisplayFormat();

  const luxonFormat = toLuxonFormat(format);

  const dateLocal = DateTime.fromJSDate(date, { zone: timeZone }).toFormat(
    luxonFormat
  );

  return {
    type: "date",
    stampUTC,
    dateUTC,
    timeZone,
    dateLocal,
    format,
  };
}

/* ---------------- Flatpickr change (USER ONLY) ---------------- */
function handleChange(selectedDates) {
  if (isProgrammaticUpdate.value) return;

  if (!selectedDates || selectedDates.length === 0) {
    emit("update:modelValue", []);
    return;
  }

  if (props.mode === "range") {
    if (selectedDates.length < 2) return;
    emit("update:modelValue", [
      buildPayload(selectedDates[0]),
      buildPayload(selectedDates[1]),
    ]);
  } else {
    emit("update:modelValue", [buildPayload(selectedDates[0])]);
  }
}

/* ---------------- Flatpickr config ---------------- */
const flatpickrConfig = computed(() => {
  const base = {
    mode: props.mode,
    enableTime: props.enableTime,
    time_24hr: true,
    allowInput: true,
    dateFormat: props.enableTime ? "d-m-Y H:i" : "d-m-Y",
    onChange: handleChange,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (props.noPastDate) base.minDate = today;
  if (props.noFutureDate) base.maxDate = today;

  return base;
});

/* -------------------------------------------------
   Clear handler
------------------------------------------------- */
function clearValue() {
  if (props.readonly || props.disabled) return;
  internalValue.value = null;
  emit("update:modelValue", []);
}

/* ---------------- Parent → UI sync ---------------- */
watch(
  () => props.modelValue,
  async (val) => {
    isProgrammaticUpdate.value = true;
    internalValue.value = normalizeIncomingValue(val);
    await nextTick();
    isProgrammaticUpdate.value = false;
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div>
    <VInput
      :error="error"
      :error-messages="errorMessages"
      :hint="hint"
      :persistent-hint="persistentHint"
      :disabled="disabled"
      density="compact"
      hide-details
    >
      <template #default="{ isFocused }">
        <VField
          :label="label"
          variant="outlined"
          :active="isFocused || !!internalValue"
          :focused="isFocused"
        >
          <!-- Prepend Icon -->
          <template v-if="prependIcon" #prepend-inner>
            <VIcon :icon="prependIcon" />
          </template>

          <!-- Append Icons -->
          <template #append-inner>
            <VIcon
              v-if="clearable && internalValue && !readonly"
              icon="mdi-close-circle"
              class="cursor-pointer"
              @click.stop="clearValue"
            />
            <VIcon v-if="appendIcon" :icon="appendIcon" />
          </template>

          <template #default>
            <div class="v-field__input v-input__control">
              <FlatPickr
                :model-value="internalValue"
                :config="flatpickrConfig"
                :placeholder="placeholder"
                :disabled="disabled"
                class="flatpickr-input w-100"
              />
            </div>
          </template>
        </VField>
      </template>
    </VInput>
  </div>
</template>

<style scoped>
.flatpickr-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
}
</style>

<!--
    structure
        [
            {
                type: 'date',

                stampUTC: number,        // ✅ source of truth (UTC milliseconds)
                dateUTC: string,         // ✅ ISO string in UTC
                dateLocal: string,       // formatted local date/time
                format: string           // e.g. "DD/MM/YYYY" or "DD/MM/YYYY HH:mm"
                timeZone: string,        // e.g. "Asia/Kolkata::GMT+5:30"
            }
        ]


    Invariants

        Component always EMITS an array
            single mode → [ { … } ]
            range mode → [ { … }, { … } ]

        stampUTC is the single source of truth
            everything else is derived from it

        Timezone never affects stampUTC
            timezone is metadata, not math

        Input is permissive, output is strict
            accept many shapes
            emit exactly one shape


    Accepted input formats (very tolerant)

        single versions :

            [
                {
                    stampUTC: 973881000000,
                    dateUTC: "2000-11-11T00:00:00.000Z"
                }
            ]

            "2000-11-11T00:00:00.000Z"

            973881000000

            {
                dateLocal: "11/11/2000",
                format: "DD/MM/YYYY",
                timeZone: "Asia/Kolkata"
            }

        Range versions :

            [
                "2000-11-01T00:00:00.000Z",
                "2000-11-30T00:00:00.000Z"
            ]


    flow :
        Parent (filter state)
                ↓
        Normalization layer
                ↓
        Flatpickr (UI widget)
                ↓
        Emit canonical date payload
-->
