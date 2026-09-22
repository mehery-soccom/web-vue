<script setup>
import { useTheme } from "vuetify";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";

const props = defineProps({
  item: { type: Object, required: true },
  colorIndex: { type: Number, default: 0 },
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
    bg: "#FFF3E8",
    accent: "#FF9F43",
    iconBg: "#FFE0C0",
    pillBg: "#FFE4C8",
    border: "#FFD0A0",
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
    bg: "#3A2C1F",
    accent: "#FFB56B",
    iconBg: "#54402A",
    pillBg: "#4C3A27",
    border: "#A86E3D",
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

const AppEngagementsStore = useAppEngagementsStore();
const isCountLoading = ref(false);
const count = ref(null);
const countError = ref(false);

const parseAudienceCount = (res) => {
  const data = res?.data?.data ?? res?.data ?? {};
  const value = data.count ?? data.total ?? data.users ?? data.audienceCount;
  return typeof value === "number" ? value : Number(value);
};

const loadCount = async () => {
  if (!props.item?.filter) {
    count.value = 0;
    return;
  }
  isCountLoading.value = true;
  countError.value = false;
  try {
    const res = await AppEngagementsStore.fetchAudienceCount({
      filter: props.item.filter,
    });
    const parsed = parseAudienceCount(res);
    count.value = Number.isFinite(parsed) ? parsed : 0;
  } catch (e) {
    count.value = null;
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
          <span class="dashboard-block__count" :style="{ color: theme.accent }">
            {{ (count ?? 0).toLocaleString() }}
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
  gap: 6px;
  padding: 8px 16px;
  margin-top: auto;
}

.dashboard-block__count {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.dashboard-block__users {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
  line-height: 1;
}
</style>
