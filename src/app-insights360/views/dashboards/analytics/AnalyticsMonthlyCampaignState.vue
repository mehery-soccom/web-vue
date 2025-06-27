<script setup>
const props = defineProps({
  statistics: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    required: false
  }
});
const monthlyCampaignState = computed(() => [
  {
    avatarColor: 'info',
    avatarIcon: 'tabler-mail',
    title: 'Sent',
    count: props.statistics.total,
    stats: '100%',
    statsColor: 'success',
  },
  {
    avatarColor: 'warning',
    avatarIcon: 'tabler-click',
    title: 'Delivered',
    count: props.statistics.delivered,
    stats: `${((props.statistics.delivered/props.statistics.total) * 100).toFixed(2)}%`,
    statsColor: 'warning',
  },
  {
    avatarColor: 'primary',
    avatarIcon: 'tabler-users',
    title: 'Views',
    count: props.statistics.read,
    stats: `${((props.statistics.read / props.statistics.total) * 100).toFixed(2)}%`,
    statsColor: 'info',
  },
  {
    avatarColor: 'success',
    avatarIcon: 'tabler-link',
    title: 'Replies',
    count: props.statistics.responded,
    stats: `${((props.statistics.responded / props.statistics.total) * 100).toFixed(2)}%`,
    statsColor: 'success',
  },
  {
    avatarColor: 'error',
    avatarIcon: 'tabler-alert-triangle',
    title: 'Failed',
    count: props.statistics.failed,
    stats: `${((props.statistics.failed / props.statistics.total) * 100).toFixed(2)}%`,
    statsColor: 'error',
  },
])
</script>

<template>
  <VCard
    :title="`${title}`"
  >
    <!-- <template #append>
      <div class="mt-n4 me-n2">
        <MoreBtn :menu-list="moreMenuList" />
      </div>
    </template> -->

    <VCardText>
      <VList class="card-list">
        <VListItem
          v-for="state in monthlyCampaignState"
          :key="state.title"
        >
          <template #prepend>
            <VAvatar
              :color="state.avatarColor"
              variant="tonal"
              size="34"
              rounded
            >
              <VIcon :icon="state.avatarIcon" />
            </VAvatar>
          </template>

          <VListItemTitle class="font-weight-medium">
            {{ state.title }}
          </VListItemTitle>

          <template #append>
            <span class="font-weight-medium text-medium-emphasis me-3">{{ state.count }}</span>
            <span :class="`text-${state.statsColor}`">{{ state.stats }}</span>
          </template>
        </VListItem>
      </VList>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 26px;
}
</style>
