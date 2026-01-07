<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NotificationPreviewApp from '@/app-pushapp/views/admin/push-notification/NotificationPreviewApp.vue';
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useAppEngagementsStore } from '@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore';
const AppEngagementsStore = useAppEngagementsStore();
const { TYPES, SUB_TYPES } = useAppEngagements();

const router = useRouter();
const selectedType = ref(SUB_TYPES[0]?.type || '');
// const props = defineProps({
//   embedded: { type: Boolean, default: false },
// });

const types = computed(() => {
  const uniqueTypes = new Map();
  for (const subtype of SUB_TYPES) {
    if (!uniqueTypes.has(subtype.type)) {
      const matchedType = TYPES.find(t => t.value === subtype.type);
      uniqueTypes.set(subtype.type, {
        type: subtype.type,
        label: matchedType ? matchedType.label : subtype.type.charAt(0).toUpperCase() + subtype.type.slice(1),
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

// const temp = ref(null);
// const templateList = ref([])
// const fetchTemplateList = async () => {
//   try{
//     const response = await AppEngagementsStore.fetchTemplates({ page: 0, itemsPerPage: 100 })
//     templateList.value = response.data.results.map((r) => ({
//       ...r,
//       id: r._id,
//     }));
//   }catch(e){
//     console.log("templates error",e)
//   }
// }

const emit = defineEmits(['selectTemplate']);
const handlePreviewClick = (template) => {
  const tem = JSON.parse(JSON.stringify(template))
  // if(!tem.view) tem.view = { appearance: "light", layout: "full", mode: "collapse", platform:"ios" }
  emit('selectTemplate', tem);
  console.log("trig", tem)
};

onMounted(async () => {
  // await fetchTemplateList();
})
</script>

<template>
  <v-row>
    <!-- Sidebar with Types -->
    <v-col cols="3">
        <!-- <div v-if="embedded" style="margin-bottom: 10px;">
          <AppSelect
            v-model="temp"
            :items="templateList"
            placeholder="Select Template"
            item-title="desc"
            return-object
            prepend-inner-icon="mdi-shape"
            @update:modelValue="handlePreviewClick(temp)"
          />
        </div> -->
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
      <v-row class="justify-space-evenly">
        <v-col
          v-for="(template, index) in previews"
          :key="index"
          cols="12"
          sm="6"
          md="4"
          class="d-flex align-center flex-column mb-4"
          style="max-width: 270px;"
          @click="handlePreviewClick(template)"
        >
          <div class="d-flex flex-column align-center w-100">
            <div class="mb-2 text-center">{{ template.title }}</div>
            <NotificationPreviewApp :template="template" style="max-width: 260px"/>
          </div>
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
