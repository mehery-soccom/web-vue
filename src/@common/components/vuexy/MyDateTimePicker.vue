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
  relativePresets: {
    type: Array,
    default: () => []
  }
});

// const emit = defineEmits(["update:modelValue"]);
const emit = defineEmits([ "update:modelValue", "relative-selected" ]);

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
    if (input.stamp) return new Date(input.stamp);
    if (input.dateUTC) return new Date(input.dateUTC);
    if (input.date && input.format) {
      const dt = DateTime.fromFormat(input.date, input.format, {
        zone: input.timeZone || getUserTimeZone(),
      });
      return dt.isValid ? dt.toJSDate() : null;
    }
  }
  return null;
}

function normalizeIncomingValue(val) {
  if (!val) return null;
  const first = Array.isArray(val) ? val[0] : val;
  if (first?.date && !first?.stamp && !first?.dateUTC) return null;
  if (Array.isArray(val)) {
    const dates = val.map(parseToDate).filter(Boolean);
    return props.mode === "range" ? dates.slice(0, 2) : dates[0] ?? null;
  }
  return parseToDate(val);
}

/* ---------------- Internal state ---------------- */
const internalValue = ref(null);
const selectedRelative = ref(null)
const offset = ref(null)
const offsetUnit = ref("days")
const presetButtons = {};
const isProgrammaticUpdate = ref(false); // standard imperative-widget guard - “If I caused this change, ignore it. If the user caused this change, emit it.”

/* ---------------- Emit payload (STRICT contract) ---------------- */
function buildPayload(date) {
  const stamp = date.getTime();
  const dateUTC = new Date(stamp).toISOString();
  const timeZone = getUserTimeZone();

  const format = getDisplayFormat();

  const luxonFormat = toLuxonFormat(format);

  const dateLocal = DateTime.fromJSDate(date, { zone: timeZone }).toFormat(
    luxonFormat
  );

  return {
    type: "date",
    stamp,
    dateUTC,
    timeZone,
    date: dateLocal,
    format,
  };
}
function emitRelativePayload() {
  const timeZone = getUserTimeZone();
  emit("update:modelValue", [
    {
      type: "relativeDate",
      date: selectedRelative.value,
      timeZone: timeZone,
      offset: offset.value,
      offsetUnit: offsetUnit.value
    }
  ])
}

/* ---------------- Flatpickr change (USER ONLY) ---------------- */
function handleChange(selectedDates) {
  if (isProgrammaticUpdate.value) return;
  selectedRelative.value = null;
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
/* ---------------- Relative preset select ---------------- */
function selectRelativePreset(preset) {
  selectedRelative.value = preset.key
  offset.value = null;
  offsetUnit.value = "days"

  emitRelativePayload()
}

watch([offset, offsetUnit], () => {
  if (!selectedRelative.value) return
  emitRelativePayload()
})
watch(selectedRelative, (val) => {
  Object.values(presetButtons).forEach(btn => btn.classList.remove("active"))
  if (val && presetButtons[val]) presetButtons[val].classList.add("active")
})
/* ---------------- Flatpickr config ---------------- */
const flatpickrConfig = computed(() => {
  const base = {
    mode: props.mode,
    enableTime: props.enableTime,
    time_24hr: true,
    allowInput: true,
    // static: true,
    // closeOnScroll: false,
    dateFormat: props.enableTime ? "d-m-Y H:i" : "d-m-Y",
    onChange: handleChange,
    onReady(selectedDates, dateStr, instance) {
      if (props.mode === "range") return
      const container = document.createElement("div")
      container.className = "relative-shortcuts"
      const btnWrapper = document.createElement("div")
      btnWrapper.className = "relative-btn-wrapper"

      function createBtn(label, preset) {
        const btn = document.createElement("button")
        btn.type = "button"
        btn.textContent = label
        btn.className = "relative-btn"

        presetButtons[preset.key] = btn
        btn.onclick = () => { selectRelativePreset(preset) }
        return btn
      }

      props.relativePresets.forEach(preset => {
        btnWrapper.appendChild(createBtn(preset.label, preset))
      })
      container.appendChild(btnWrapper)

      instance.calendarContainer.appendChild(container)
    }
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
  selectedRelative.value = null
  offset.value = null;
  offsetUnit.value = "days"
  emit("update:modelValue", []);
}

/* ---------------- Parent → UI sync ---------------- */
watch(
  () => props.modelValue,
  async (val) => {
    isProgrammaticUpdate.value = true;
    const first = val?.[0];
    if (first?.date && !first?.stamp && !first?.dateUTC){
      selectedRelative.value = first.date
      offset.value = first.offset ?? null
      offsetUnit.value = first.offsetUnit ?? "days"
    }
    internalValue.value = normalizeIncomingValue(val);
    await nextTick();
    isProgrammaticUpdate.value = false;
  },
  { immediate: true, deep: true }
);

const fpRef = ref(null)
const handleScroll = () => {
  const fp = fpRef.value?.fp
  if (!fp) return
  if (!fp.isOpen) fp.open(undefined, fp._positionElement)
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll, true)
})
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
            <VChip v-if="selectedRelative"
              size="medium"
              color="primary"
              variant="tonal"
              class="mr-2" style="padding: 3.5px 15px 3px;"
            >{{ props.relativePresets.find(p => p.key === selectedRelative)?.label }}
            </VChip>
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
                :key="props.mode"
                :model-value="internalValue"
                :config="flatpickrConfig"
                :placeholder="placeholder"
                :disabled="disabled" ref="fpRef"
                class="flatpickr-input w-100"
              />
            </div>
          </template>
        </VField>
      </template>
    </VInput>
    <div v-if="selectedRelative && props.mode !== 'range'" class="d-flex gap-2">
      <AppTextField
        v-model="offset"
        type="number"
        placeholder="Offset"
        density="compact"
        style="max-width:100px; margin-left: 8px;"
      />
      <AppSelect v-model="offsetUnit"
        :items="[
          { title:'Days', value:'days' },
          { title:'Months', value:'months' }
        ]"
        density="compact"
      />
    </div>
  </div>
</template>

<style>
.flatpickr-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
}
.relative-shortcuts {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 8px 12px;
  background: rgb(var(--v-theme-surface));
}
.relative-btn-wrapper {
  display: flex;
  gap: 8px;
}
.relative-btn {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.relative-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
.relative-btn.active {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-color: rgb(var(--v-theme-primary));
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
