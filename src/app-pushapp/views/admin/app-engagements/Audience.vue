<script setup>
import { reactive, ref } from "vue";
import FilterBuilder from "./FilterBuilder.vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
  filter: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue", "update:filter"]);

// Clone object for internal form usage
const form = reactive(JSON.parse(JSON.stringify(props.modelValue)));
const filterLocal = reactive(JSON.parse(JSON.stringify(props.filter)));

// Watch & sync
watch(form, (val) => emit("update:modelValue", val), { deep: true });
watch(filterLocal, (val) => emit("update:filter", val), { deep: true });

const filterRef = ref(null);

const userSetOptions = [
  { title: "All Users", value: "All Users" },
  //   { title: "Segments", value: "Segments" },
];
const segmentConditionOptions = [
  { title: "any of these segments (Union)", value: "any" },
  { title: "all of these segments (Intersection)", value: "all" },
];
const segmentsOptions = [
  { title: "Segment 1", value: "1" },
  { title: "Segment 2", value: "2" },
];

const isValid = async () => filterRef.value?.isValid();

defineExpose({ isValid });
</script>

<template>
  <VCard class="pa-6 audience">
    <h3 class="mb-2">Segments</h3>
    <p class="text-caption mb-4">
      Select whether you want to target all users or specific segments
    </p>

    <VRow dense>
      <VCol cols="12" md="4">
        <AppSelect
          v-model="form.userSet"
          :items="userSetOptions"
          label="User Set"
          class="flex-grow-1 tiny-input"
        />
      </VCol>

      <template v-if="form.userSet === 'Segments'">
        <VCol cols="12" md="8"></VCol>

        <VCol cols="12" md="4">
          <AppSelect
            v-model="form.segmentCondition"
            :items="segmentConditionOptions"
            label="Include users who are in"
          />
        </VCol>

        <VCol cols="12" md="4">
          <AppSelect
            v-model="form.segment"
            :items="segmentsOptions"
            label="Segments"
            multiple
            chips
          />
        </VCol>

        <VCol cols="12" md="4"></VCol>

        <VCol cols="4">
          <VBtn variant="text" size="small" prepend-icon="mdi-plus">
            Add excluded users
          </VBtn>
        </VCol>
      </template>
    </VRow>

    <VDivider class="my-6" />

    <h3 class="mb-2">Real-Time Filter</h3>
    <p class="text-caption mb-4">
      Apply filters based on app events and latest user attributes
    </p>

    <FilterBuilder v-model="filterLocal" ref="filterRef" />
  </VCard>
</template>

<style>
.audience {
  .tiny-input .v-field__input {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 1rem !important;
    min-height: 32px !important; /* instead of ~40px */
  }
}
</style>
