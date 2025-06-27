<script setup>
const props = defineProps({
  statistics: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: false
  }
});
</script>

<template>
  <VCard :title="title">
    <VCardText>
      <VRow>
        <VCol
          v-for="item in statistics"
          :key="item.title"
          cols="6"
          :md="statistics.length == 3 ? 4 : 3"
        >
          <div class="d-flex">
            <VAvatar
              :color="item.color"
              variant="tonal"
              size="42"
              class="me-3"
            >
              <VIcon :icon="item.icon" />
            </VAvatar>

            <div class="d-flex flex-column">
              <span class="text-h5 font-weight-medium">{{ item.stats }}</span>
              <span class="text-sm">
                {{ item.title }}
              </span>
            </div>
          </div>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
