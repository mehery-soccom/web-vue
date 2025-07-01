<script setup>
import { ref, watch, computed } from "vue";

// Props
const props = defineProps({
  fields: {
    type: Array,
    required: true,
  },
  dynamicPrefixes: {
    type: Array,
    default: () => ["data"],
  },
});

// Emits
const modelValue = defineModel({ default: () => ({}) });

// Internal reactive state for dynamic keys (per prefix)
const internalDynamic = ref({});

// Build dynamic regex matchers
const regexList = computed(() =>
  props.dynamicPrefixes.map((prefix) => ({
    prefix,
    regex: new RegExp(`{{\\s*${prefix}\\.([a-zA-Z0-9_]+)\\s*}}`, "g"),
  }))
);

// Extract keys from fields for each dynamic prefix
watch(
  () => props.fields.map((f) => f.value),
  (fieldValues) => {
    const updatedDynamic = {};

    for (const { prefix, regex } of regexList.value) {
      const keys = new Set();

      for (const val of fieldValues) {
        let match;
        while ((match = regex.exec(val)) !== null) {
          keys.add(match[1]);
        }
        regex.lastIndex = 0;
      }

      const current = internalDynamic.value?.[prefix] ?? {};
      const result = {};

      for (const key of keys) {
        result[key] = current[key] ?? "";
      }

      updatedDynamic[prefix] = result;
    }

    internalDynamic.value = updatedDynamic;
  },
  { immediate: true }
);

// internalDynamic → modelValue sync
watch(
  internalDynamic,
  (val) => {
    const newValue = { ...(modelValue.value || {}) };

    let changed = false;
    for (const prefix of props.dynamicPrefixes) {
      const current = newValue[prefix] || {};
      const next = val[prefix] || {};

      if (JSON.stringify(current) !== JSON.stringify(next)) {
        newValue[prefix] = { ...next };
        changed = true;
      }
    }

    if (changed) {
      modelValue.value = newValue;
    }
  },
  { deep: true }
);

// modelValue → internalDynamic sync
watch(
  modelValue,
  (val) => {
    const copy = {};
    let changed = false;

    for (const prefix of props.dynamicPrefixes) {
      const fromModel = val?.[prefix] || {};
      const fromInternal = internalDynamic.value[prefix] || {};

      if (JSON.stringify(fromModel) !== JSON.stringify(fromInternal)) {
        copy[prefix] = { ...fromModel };
        changed = true;
      } else {
        copy[prefix] = fromInternal;
      }
    }

    if (changed) {
      internalDynamic.value = copy;
    }
  },
  { immediate: true }
);

// Combined rows: dynamic + predefined
const tableRows = computed(() => {
  const all = {};

  // Predefined prefixes (everything that's not dynamic)
  for (const [prefix, group] of Object.entries(modelValue.value ?? {})) {
    if (!props.dynamicPrefixes.includes(prefix)) {
      for (const [key, val] of Object.entries(group)) {
        all[`${prefix}.${key}`] = val;
      }
    }
  }

  // Dynamic fields
  for (const prefix of props.dynamicPrefixes) {
    const group = internalDynamic.value?.[prefix] ?? {};
    for (const [key, val] of Object.entries(group)) {
      all[`${prefix}.${key}`] = val;
    }
  }

  return all;
});

// Updates when user changes a value in the table
const updateValue = (fullKey, value) => {
  const [prefix, key] = fullKey.split(".");

  if (!modelValue.value) modelValue.value = {};

  if (props.dynamicPrefixes.includes(prefix)) {
    internalDynamic.value[prefix] = {
      ...(internalDynamic.value[prefix] || {}),
      [key]: value,
    };
  } else {
    modelValue.value[prefix] = {
      ...(modelValue.value[prefix] || {}),
      [key]: value,
    };
  }
};

const escapedInstruction =
  `please use {{data.<variable_name>}} for custom variables in your template`
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
</script>

<template>
  <VTable v-if="Object.keys(tableRows).length">
    <thead>
      <tr>
        <th>Key</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(value, fullKey) in tableRows" :key="fullKey">
        <td>{{ fullKey }}</td>
        <td>
          <VTextField
            :model-value="value"
            @update:model-value="updateValue(fullKey, $event)"
            :placeholder="`Value for ${fullKey}`"
            dense
            hide-details
          />
        </td>
      </tr>
    </tbody>
  </VTable>
  <div v-else v-html="escapedInstruction" />
</template>
