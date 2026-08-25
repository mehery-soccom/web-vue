<script setup>
import { useAppEngagementsStore } from "./useAppEngagementsStore";

const props = defineProps({
  filter: { type: Object, required: true },
  /** Optional async () => boolean. Return false to abort the count request. */
  validate: { type: Function, default: null },
});

const { show } = inject("snackbar");
const AppEngagementsStore = useAppEngagementsStore();
const isCountLoading = ref(false);
const audienceCount = ref(null);

const parseAudienceCount = (res) => {
  const data = res?.data?.data ?? res?.data ?? {};
  const count = data.count ?? data.total ?? data.users ?? data.audienceCount;
  return typeof count === "number" ? count : Number(count);
};

const onCheckCount = async () => {
  if (props.validate) {
    const ok = await props.validate();
    if (!ok) return;
  }

  try {
    isCountLoading.value = true;
    const res = await AppEngagementsStore.fetchAudienceCount({
      filter: props.filter,
    });
    const count = parseAudienceCount(res);
    audienceCount.value = Number.isFinite(count) ? count : 0;
  } catch (error) {
    audienceCount.value = null;
    const apiErr = error.response?.data;
    show({
      message:
        apiErr?.error?.message ||
        apiErr?.message ||
        "Failed to fetch audience count",
      color: "error",
    });
  } finally {
    isCountLoading.value = false;
  }
};

watch(
  () => props.filter,
  () => {
    audienceCount.value = null;
  },
  { deep: true },
);
</script>

<template>
  <VBtnGroup divided class="audience-count-group">
    <VBtn
      variant="tonal"
      color="primary"
      class="audience-count-display"
      tabindex="-1"
    >
      <VIcon start icon="tabler-users" size="18" />
      <template v-if="audienceCount !== null">
        {{ audienceCount.toLocaleString() }} users
      </template>
      <template v-else> — users </template>
    </VBtn>
    <VBtn
      variant="tonal"
      color="primary"
      :loading="isCountLoading"
      :disabled="isCountLoading"
      @click="onCheckCount"
    >
      <VIcon start icon="tabler-refresh" size="18" />
      Check
    </VBtn>
  </VBtnGroup>
</template>

<style scoped>
.audience-count-group {
  height: 38px !important;
}
.audience-count-display {
  pointer-events: none;
  min-width: 130px;
  justify-content: flex-start;
}
</style>
