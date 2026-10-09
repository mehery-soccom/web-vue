<script setup>
import { useTheme } from "vuetify";
import { useCustomDashboardStore } from "@/app-pushapp/views/dashboards/custom/useCustomDashboardStore";

const props = defineProps({
  item: { type: Object, required: true },
  colorIndex: { type: Number, default: 0 },
  dateRange1: { type: Number, default: null },
  dateRange2: { type: Number, default: null },
  timezone: { type: String, default: "Asia/Kolkata" },
  cohortId: { type: String, default: null },
});

const emit = defineEmits(["edit", "delete"]);
const { global: themeGlobal } = useTheme();
const isDark = computed(() => themeGlobal.current.value.dark);

const BLOCK_COLORS_LIGHT = [
  {
    bg: "#F0EDFF",
    accent: "#7367F0",
    iconBg: "#E0DBFF",
    pillBg: "#E4DFFF",
    border: "#C8C0F8",
    title: "#2F2B3D",
    desc: "#6E6B7B",
  },
  {
    bg: "#E8F8EF",
    accent: "#28C76F",
    iconBg: "#D0F0DE",
    pillBg: "#D4F0E0",
    border: "#A8E0C0",
    title: "#2F2B3D",
    desc: "#6E6B7B",
  },
  {
    bg: "#FFF0F0",
    accent: "#EA5455",
    iconBg: "#FADCDC",
    pillBg: "#F8E0E0",
    border: "#F0C0C0",
    title: "#2F2B3D",
    desc: "#6E6B7B",
  },
  {
    bg: "#E5F9FC",
    accent: "#00CFE8",
    iconBg: "#C8F0F8",
    pillBg: "#D0F4F8",
    border: "#A0E4F0",
    title: "#2F2B3D",
    desc: "#6E6B7B",
  },
];

const BLOCK_COLORS_DARK = [
  {
    bg: "#2C2848",
    accent: "#A097F5",
    iconBg: "#3D3770",
    pillBg: "#3A3468",
    border: "#5A52A8",
    title: "#E8E6F5",
    desc: "#B8B5C8",
  },
  {
    bg: "#1F3A2C",
    accent: "#48D68A",
    iconBg: "#2A5440",
    pillBg: "#274C3A",
    border: "#3D8A5E",
    title: "#E8E6F5",
    desc: "#B8B5C8",
  },
  {
    bg: "#3A2426",
    accent: "#FF8A8B",
    iconBg: "#543034",
    pillBg: "#4C2C30",
    border: "#A85054",
    title: "#E8E6F5",
    desc: "#B8B5C8",
  },
  {
    bg: "#1F353A",
    accent: "#4DE0F0",
    iconBg: "#2A4A54",
    pillBg: "#27444C",
    border: "#3D8A98",
    title: "#E8E6F5",
    desc: "#B8B5C8",
  },
];

const theme = computed(() => {
  const palette = isDark.value ? BLOCK_COLORS_DARK : BLOCK_COLORS_LIGHT;
  return palette[props.colorIndex % palette.length];
});

const store = useCustomDashboardStore();
const isCountLoading = ref(false);
const uniqueUsers = ref(null);
const totalEvents = ref(null);
const hasTotalEvents = ref(false);
const countError = ref(false);

const toCount = (value) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const loadCount = async () => {
  if (!props.item?.filter || props.dateRange1 == null || props.dateRange2 == null) {
    uniqueUsers.value = 0;
    totalEvents.value = null;
    hasTotalEvents.value = false;
    return;
  }
  isCountLoading.value = true;
  countError.value = false;
  try {
    const payload = {
      dateRange1: props.dateRange1,
      dateRange2: props.dateRange2,
      timezone: props.timezone,
      filter: props.item.filter,
    };
    if (props.cohortId) payload.cohortId = props.cohortId;

    const res = await store.fetchEventFilterStats(payload);
    const data = res?.data ?? {};
    hasTotalEvents.value =
      Object.prototype.hasOwnProperty.call(data, "total_events") &&
      data.total_events != null;
    uniqueUsers.value = toCount(data.unique_users);
    totalEvents.value = hasTotalEvents.value ? toCount(data.total_events) : null;
  } catch (e) {
    uniqueUsers.value = null;
    totalEvents.value = null;
    hasTotalEvents.value = false;
    countError.value = true;
  } finally {
    isCountLoading.value = false;
  }
};

const iconName = computed(() => props.item?.icon || "tabler-chart-bar");

onMounted(loadCount);
watch(
  () => props.item?.filter,
  () => loadCount(),
  { deep: true },
);
watch(
  () => [props.dateRange1, props.dateRange2, props.timezone, props.cohortId],
  () => loadCount(),
);
</script>

<template>
  <VCard
    class="dashboard-block"
    flat
    :style="{
      backgroundColor: theme.bg,
      borderColor: theme.border,
      '--block-accent': theme.accent,
      '--block-icon-bg': theme.iconBg,
      '--block-pill-bg': theme.pillBg,
      '--block-title': theme.title,
      '--block-desc': theme.desc,
    }"
  >
    <div class="dashboard-block__actions">
      <VBtn
        icon
        size="x-small"
        variant="flat"
        color="white"
        @click.stop="emit('edit', item)"
      >
        <VIcon size="16" icon="tabler-edit" :color="theme.accent" />
      </VBtn>
      <VBtn
        icon
        size="x-small"
        variant="flat"
        color="white"
        @click.stop="emit('delete', item)"
      >
        <VIcon size="16" icon="tabler-trash" color="error" />
      </VBtn>
    </div>

    <VCardText class="dashboard-block__body">
      <div class="dashboard-block__icon">
        <VIcon :icon="iconName" size="26" :color="theme.accent" />
      </div>

      <h4 class="dashboard-block__title" :title="item.title">
        {{ item.title }}
      </h4>

      <p
        v-if="item.description"
        class="dashboard-block__desc"
        :title="item.description"
      >
        {{ item.description }}
      </p>
      <div v-else class="dashboard-block__desc-spacer" />

      <div class="dashboard-block__pill">
        <VProgressCircular
          v-if="isCountLoading"
          indeterminate
          size="20"
          width="2"
          :color="theme.accent"
        />
        <template v-else-if="countError">
          <span class="text-error text-body-2">Failed</span>
          <VBtn
            size="x-small"
            variant="text"
            class="ms-1"
            :style="{ color: theme.accent }"
            @click="loadCount"
          >
            Retry
          </VBtn>
        </template>
        <template v-else>
          <template v-if="hasTotalEvents">
            <span class="dashboard-block__count" :style="{ color: theme.accent }">
              {{ (totalEvents ?? 0).toLocaleString("en-IN") }}
            </span>
            <span class="dashboard-block__users" :style="{ color: theme.accent }">
              events
            </span>
            <span class="dashboard-block__sep" :style="{ color: theme.accent }">·</span>
          </template>
          <span class="dashboard-block__count" :style="{ color: theme.accent }">
            {{ (uniqueUsers ?? 0).toLocaleString("en-IN") }}
          </span>
          <span class="dashboard-block__users" :style="{ color: theme.accent }">
            users
          </span>
        </template>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped lang="scss">
.dashboard-block {
  position: relative;
  height: 100%;
  border-radius: 12px !important;
  border: 1px solid transparent;
  border-left: 5px solid var(--block-accent) !important;
  overflow: hidden;
  transition: box-shadow 0.15s ease;

  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);

    .dashboard-block__actions {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.dashboard-block__actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 1;
}

.dashboard-block__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px 20px 18px !important;
  height: 100%;
}

.dashboard-block__icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--block-icon-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.dashboard-block__title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--block-title);
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.dashboard-block__desc {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--block-desc);
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  flex: 1;
}

.dashboard-block__desc-spacer {
  flex: 1;
  min-height: 16px;
  margin-bottom: 16px;
}

.dashboard-block__pill {
  width: 100%;
  min-height: 40px;
  border-radius: 999px;
  background: var(--block-pill-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  margin-top: auto;
}

.dashboard-block__sep {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.7;
  line-height: 1;
}

.dashboard-block__count {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
}

.dashboard-block__users {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
  line-height: 1;
}
</style>
