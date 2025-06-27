<template>
  <AppTextField
    v-model="color"
    maxlength="7"
    :label="label"
    :placeholder="placeholder"
    prepend-inner-icon="mdi-palette"
  >
    <template #append-inner>
      <v-tooltip text="Pick a color">
        <template #activator="{ props }">
          <div
            v-bind="props"
            class="color-swatch"
            :style="{ backgroundColor: color }"
            @click.stop="menu = true"
          />
        </template>
      </v-tooltip>
    </template>
  </AppTextField>

  <!-- Color Picker Menu -->
  <v-menu v-model="menu" :close-on-content-click="false">
    <template #activator="{ props }">
      <span v-bind="props" />
    </template>

    <v-card width="300">
      <v-color-picker
        v-model="color"
        mode="hexa"
        :modes="['hexa']"
        hide-mode-switch
        flat
        elevation="0"
      />
      <v-card-actions class="justify-end">
        <v-btn text @click="menu = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
import { defineEmits, defineProps, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  label: {
    type: String,
  },
  placeholder: {
    type: String,
  },
});

const emit = defineEmits(["update:modelValue"]);

const menu = ref(false);
const color = ref(props.modelValue);

watch(
  () => props.modelValue,
  (val) => {
    if (val !== color.value) color.value = val;
  }
);

watch(color, (val) => {
  emit("update:modelValue", val);
});
</script>

<style>
.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #ccc;
  cursor: pointer;
  margin-left: 8px;
}
.v-color-picker-preview__sliders {
  .v-color-picker-preview__alpha {
    display: none !important;
  }
}
</style>
