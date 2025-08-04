<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import NotificationPreview from '@/app-pushapp/views/admin/push-notification/NotificationPreview.vue';
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
const { TYPES, SUB_TYPES } = useAppEngagements();

const router = useRouter();
const selectedType = ref(SUB_TYPES[0]?.type || '');

const types = computed(() => {
  const uniqueTypes = new Map();
  for (const subtype of SUB_TYPES) {
    if (!uniqueTypes.has(subtype.type)) {
      uniqueTypes.set(subtype.type, {
        type: subtype.type,
        label: subtype.type.charAt(0).toUpperCase() + subtype.type.slice(1),
        count: 1,
      });
    } else {
      uniqueTypes.get(subtype.type).count++;
    }
  }
  return Array.from(uniqueTypes.values());
});

const previews = computed(() => {
  return SUB_TYPES.filter((s) => s.type === selectedType.value && s.preview?.dummy).map((s) => s.preview.dummy);
});

const emit = defineEmits(['selectTemplate']);
const handlePreviewClick = (template) => {
  emit('selectTemplate', template);
};
</script>

<template>
  <v-row>
    <!-- Sidebar with Types -->
    <v-col cols="3">
      <v-list nav dense>
        <v-list-item
          v-for="type in types"
          :key="type.type"
          :active="selectedType === type.type"
          @click="selectedType = type.type"
        >
          <v-list-item-title>{{ type.label }} ({{ type.count }})</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-col>

    <!-- Previews -->
    <v-col cols="9">
      <v-row>
        <v-col
          v-for="(template, index) in previews"
          :key="index"
          cols="12"
          sm="6"
          md="4"
          class="d-flex justify-center mb-4"
          style="max-width: 250px"
          @click="handlePreviewClick(template)"
        >
          <NotificationPreview :template="template" />
        </v-col>
      </v-row>
    </v-col>
  </v-row>
</template>

<style scoped>
v-list-item {
  cursor: pointer;
}

v-list-item--active {
  background-color: #eeeeee;
}
</style>
