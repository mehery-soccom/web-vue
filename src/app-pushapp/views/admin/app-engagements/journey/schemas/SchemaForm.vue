<script setup>
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";

const props = defineProps({
  schema: { type: Array, required: true },
  modelValue: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const errors = ref({});

function updateField(key, value) {
  clearError(key);
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}

const appEngagementsStore = useAppEngagementsStore();
const optionsMap = reactive({});
const loadingMap = reactive({});
async function resolveOptions(field, query = "") {
  // Static options
  if (Array.isArray(field.options)) {
    optionsMap[field.key] = field.options;
    return;
  }

  // API-driven options
  if (typeof field.options === "string") {
    loadingMap[field.key] = true;

    try {
      let url = field.options;

      // replace {{query}}
      url = url.replace("{{query}}", query);

      // replace {{contextKey}}
      url = resolveTemplate(field.options, context);

      console.log("url", url);
      const hasTemplateVars = /{{.*?}}/.test(url);
      if (hasTemplateVars) return;

      const res = await appEngagementsStore.fetch({ path: url });

      optionsMap[field.key] = field.optionsGenerator
        ? field.optionsGenerator(res.data, {
            model: props.modelValue,
          })
        : res.data.results || [];
    } catch (err) {
      console.error("Options fetch failed", field.key, err);
      optionsMap[field.key] = [];
    } finally {
      loadingMap[field.key] = false;
    }
  }
}
function onFieldFocus(field) {
  if (optionsMap[field.key]) return;
  resolveOptions(field);
}
onMounted(() => {
  props.schema.forEach((field) => {
    if (field.optionsPreload && !field.dependsOn) {
      resolveOptions(field);
    }
  });
});

const searchTimers = {};
function onAutocompleteSearch(field, query) {
  if (field.source !== "dynamic") return;

  if (!field.options || typeof field.options !== "string") return;

  if (field.minChars && query.length < field.minChars) return;

  clearTimeout(searchTimers[field.key]);
  searchTimers[field.key] = setTimeout(() => {
    resolveOptions({
      ...field,
      options: field.options.replace("{{query}}", query),
    });
  }, field.debounce ?? 300);
}

const context = reactive({
  values: {},
  data: {},
});
// Build dependency graph once
const dependencyMap = {};
props.schema.forEach((field) => {
  if (!field.dependsOn) return;
  field.dependsOn.forEach((dep) => {
    if (!dependencyMap[dep]) dependencyMap[dep] = [];
    dependencyMap[dep].push(field.key);
  });
});
// Whenever modelValue or options change, we update context.
function updateContextForField(fieldKey, value) {
  // 1️⃣ Store raw value
  context.values[fieldKey] = value;

  // 2️⃣ Store derived data under the field namespace
  const opts = optionsMap[fieldKey];
  if (opts && value != null) {
    const selected = opts.find((o) => o.value === value);
    context.data[fieldKey] = selected?.data ?? {};
  } else {
    context.data[fieldKey] = {};
  }

  console.log("updateContextForField", context);
}
function resolveTemplate(str, ctx) {
  return str.replace(/{{(.*?)}}/g, (_, expr) => {
    const value = expr
      .trim()
      .split(".")
      .reduce((acc, key) => acc?.[key], ctx);

    // 🚫 DO NOT REMOVE unresolved variables
    return value == null ? `{{${expr}}}` : value;
  });
}
// Watch modelValue to keep context in sync
watch(
  () => props.modelValue,
  (val) => {
    console.log("modelValue update 1", val);
    Object.entries(val).forEach(([k, v]) => {
      updateContextForField(k, v);
    });
  },
  { deep: true, immediate: true }
);
// Watch for dependency changes
watch(
  () => props.modelValue,
  (val, oldVal) => {
    console.log("modelValue update 2", val);
    Object.keys(dependencyMap).forEach((depKey) => {
      if (val[depKey] !== oldVal?.[depKey]) {
        dependencyMap[depKey].forEach((affectedKey) => {
          // 1️⃣ clear value
          emit("update:modelValue", {
            ...props.modelValue,
            [affectedKey]: null,
          });

          // 2️⃣ clear options
          delete optionsMap[affectedKey];

          // 3️⃣ preload if needed
          const field = props.schema.find((f) => f.key === affectedKey);
          if (field?.optionsPreload) {
            resolveOptions(field);
          }
        });
      }
    });
  },
  { deep: true }
);

function isValid(silent = false) {
  const nextErrors = {};

  for (const field of props.schema) {
    const value = props.modelValue[field.key];

    if (field.type === "duration") {
      const err = validateDuration(field, value);
      if (err) nextErrors[field.key] = err;
      continue;
    }

    if (field.type === "select" && field.required && !value) {
      nextErrors[field.key] = `${field.label} is required`;
    }

    if (
      field.required &&
      (value === null || value === undefined || value === "")
    ) {
      nextErrors[field.key] = field.error || `${field.label} is required`;
    }
  }

  if (!silent) {
    errors.value = nextErrors;
  }

  console.log("SchemaForm", nextErrors);
  return Object.keys(nextErrors).length === 0;
}

function clearError(key) {
  if (errors.value[key]) {
    const copy = { ...errors.value };
    delete copy[key];
    errors.value = copy;
  }
}

function validateDuration(field, val) {
  if (!val || val.value == null) {
    return `${field.label} is required`;
  }

  const { value, unit } = val;

  if (value <= 0) {
    return `${field.label} must be greater than 0`;
  }

  const min = field.min?.[unit];
  const max = field.max?.[unit];

  if (min != null && value < min) {
    return `${field.label} must be at least ${min} ${unit}`;
  }

  if (max != null && value > max) {
    return `${field.label} must be at most ${max} ${unit}`;
  }

  return null;
}

defineExpose({ isValid });
</script>

<template>
  <VCol v-for="field in schema" :key="field.key" :cols="field.cols ?? 6">
    <!-- DURATION FIELD -->
    <VTextField
      v-if="field.type === 'duration'"
      density="compact"
      variant="outlined"
      :label="field.label"
      type="number"
      :model-value="modelValue[field.key]?.value"
      :readonly="readonly"
      :error="!!errors[field.key]"
      :error-messages="errors[field.key]"
      @update:modelValue="
        (v) =>
          updateField(field.key, {
            ...modelValue[field.key],
            value: Number(v),
          })
      "
      class="flex-grow-1 tiny-input"
    >
      <template #prepend-inner><div class="mr-4">After</div></template>
      <template #append-inner>
        <VMenu>
          <template #activator="{ props }">
            <VBtn
              v-bind="props"
              variant="text"
              density="compact"
              class="px-0 text-capitalize"
            >
              {{ modelValue[field.key]?.unit }}
              <VIcon size="18">mdi-chevron-down</VIcon>
            </VBtn>
          </template>

          <VList>
            <VListItem
              v-for="unit in field.units"
              :key="unit.value"
              @click="
                updateField(field.key, {
                  ...modelValue[field.key],
                  unit: unit.value,
                })
              "
              class="mx-0"
            >
              <VListItemTitle class="px-0 text-capitalize">
                {{ unit.value }}
              </VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
      </template>
    </VTextField>

    <!-- SELECT FIELD -->
    <VSelect
      v-else-if="field.type === 'select'"
      density="compact"
      variant="outlined"
      :label="field.label"
      :items="optionsMap[field.key] || []"
      :loading="loadingMap[field.key]"
      :model-value="modelValue[field.key]"
      :readonly="readonly"
      :error="!!errors[field.key]"
      :error-messages="errors[field.key]"
      item-title="title"
      item-value="value"
      @focus="onFieldFocus(field)"
      @update:modelValue="(v) => updateField(field.key, v)"
      class="flex-grow-1 tiny-input"
    />

    <!-- AUTOCOMPLETE FIELD -->
    <VAutocomplete
      v-else-if="field.type === 'autocomplete'"
      density="compact"
      variant="outlined"
      :label="field.label"
      :items="optionsMap[field.key] || []"
      :loading="loadingMap[field.key]"
      :model-value="modelValue[field.key]"
      :readonly="readonly"
      :error="!!errors[field.key]"
      :error-messages="errors[field.key]"
      item-title="title"
      item-value="value"
      clearable
      hide-no-data
      hide-details="auto"
      @focus="onFieldFocus(field)"
      @update:search="(q) => onAutocompleteSearch(field, q)"
      @update:modelValue="(v) => updateField(field.key, v)"
      class="flex-grow-1 tiny-input"
    />

    <!-- DEFAULT FIELD -->
    <VTextField
      v-else
      density="compact"
      variant="outlined"
      :label="field.label"
      :type="field.type"
      :model-value="modelValue[field.key]"
      :readonly="readonly"
      :error="!!errors[field.key]"
      :error-messages="errors[field.key]"
      @update:modelValue="(v) => updateField(field.key, v)"
      class="flex-grow-1 tiny-input"
    />
  </VCol>
</template>

<style>
.tiny-input .v-field__input {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 1rem !important;
  min-height: 32px !important; /* instead of ~40px */
}
</style>
