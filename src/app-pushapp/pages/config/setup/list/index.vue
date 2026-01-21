<script setup>
import FormRenderer from "@/app-pushapp/views/config/setup/FormRenderer.vue";
import { useConfigStore } from "@/app-pushapp/views/config/useConfigStore";

const { show } = inject("snackbar");
const configStore = useConfigStore();

const headers = [
  { title: "Label", key: "label", sortable: false, width: 200 },
  { title: "Value", key: "value", sortable: false, width: 400 },
  { title: "Actions", key: "actions", sortable: false, width: 100 },
];
const setupMap = {
  pa_app_logo: {
    label: "App logo",
    desc: "Upload your app logo",
    fields: [{ label: "App logo", type: "file", required: true }],
    group: "App Settings",
  },
  pa_app_colorlist_saved: {
    label: "Color List",
    desc: "Manage your saved colors",
    fields: [
      { label: "Color code", type: "multi-color", required: true, size: 5 },
    ],
    group: "App Settings",
  },
};
const isLoading = ref(false);
const panel = ref(0);
const configList = ref([]);
const configValue = (value, item) => {
  let r = Array.isArray(value)
    ? value.map((v) => v.value).join(", ")
    : typeof value === "object"
    ? value.value
    : value;
  return r;
};
const groupedConfigs = computed(() => {
  return configList.value.reduce((groups, cfg) => {
    let key = cfg.key.replace(/\./g, "_");
    let setup = setupMap[key];
    if (setup) {
      let group = setup.group || "Default";
      let _cfg = {
        ...cfg,
        ...setup,
      };
      if (!groups[group]) groups[group] = [];
      groups[group].push(_cfg);
    } else {
      console.log("No mapping found for ", key);
    }

    return groups;
  }, {});
});
const editDialog = ref(false);
const selectedConfig = ref(null);
const fetchItems = async () => {
  try {
    isLoading.value = true;

    const response = await configStore.fetchConfigPrefs();
    configList.value = response.data.results.map((r) => ({
      ...r,
    }));
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};
const editItem = (item) => {
  selectedConfig.value = { ...item };
  editDialog.value = true;
};
const saveEdit = async (value, item) => {
  try {
    isLoading.value = true;

    // let { key: id } = item;
    let { _id: id } = item;
    id = id.replace(/\./g, "_");
    await configStore.updateConfigPref({ id, value });
    fetchItems();
    editDialog.value = false;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};
onMounted(async () => {
  fetchItems();
});
</script>

<template>
  <VContainer fluid>
    <VExpansionPanels multiple v-model="panel">
      <VExpansionPanel
        v-for="(configs, groupName) in groupedConfigs"
        :key="groupName"
      >
        <VExpansionPanelTitle>
          <strong>{{ groupName }}</strong>
        </VExpansionPanelTitle>

        <VExpansionPanelText>
          <MyDataTable
            :headers="headers"
            :items="configs"
            :items-per-page="configs.length"
            :page="1"
          >
            <template #item.value="{ item }">
              <div class="text-ellipsis">
                {{ configValue(item.raw.value) }}
              </div>
              <VTooltip
                v-if="configValue(item.raw.value)"
                activator="parent"
                location="top"
                >{{ configValue(item.raw.value) }}</VTooltip
              >
            </template>
            <template #item.actions="{ item }">
              <VIcon
                color="primary"
                icon="mdi-pencil"
                @click="editItem(item.raw)"
              />
            </template>
            <template #bottom></template>
          </MyDataTable>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Edit dialog -->
    <VDialog v-model="editDialog" max-width="500px">
      <VCard v-if="selectedConfig">
        <VCardTitle>{{ selectedConfig.label || "Edit Config" }}</VCardTitle>
        <VCardSubtitle v-if="selectedConfig.desc">{{
          selectedConfig.desc
        }}</VCardSubtitle>
        <VCardText>
          <FormRenderer
            :config="selectedConfig"
            @save="saveEdit"
            @cancel="editDialog = false"
          />
        </VCardText>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.text-ellipsis {
  width: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
