<script setup>
import debounce from "lodash/debounce";
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
const { show } = inject("snackbar");

const DEFAULT_TEST_NOTIFICATION = {
  data: `{
    "progress_percent": 0.25
}`,
  dataSimple: `{
    
}`,
  channel_id: null,
  user_id: "",
  activity_id: "",
};

const channelsStore = useChannelsStore();
const AppEngagementsStore = useAppEngagementsStore();
const isLoading = ref(false);
const items = ref([]);
const ChannelList = ref([]);
const testNotification = reactive({
  ...DEFAULT_TEST_NOTIFICATION,
});
const headers = [
  {
    title: "Name",
    key: "desc",
  },
  {
    title: "Code",
    key: "code",
  },
  {
    title: "Type",
    key: "type",
  },
  {
    title: "Created",
    key: "createdAt",
  },
  {
    title: "Updated",
    key: "updatedAt",
  },
  {
    title: "",
    key: "actions",
    sortable: false,
  },
];
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    desc: null,
    code: null,
    // type: null,
  },
});

const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  fetchTemplates({ ...pagination });
};
const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);

onMounted(async () => {
  let channelsRes = await channelsStore.fetchChannels().catch((error) => error);
  if (channelsRes.results) ChannelList.value = channelsRes.results;

  // fetchTemplates({ ...pagination });
});

// 👉 Fetch Templates
const fetchTemplates = async (params) => {
  try {
    isLoading.value = true;

    const response = await AppEngagementsStore.fetchTemplates(params)
    items.value = response.data.results.map((r) => ({
      ...r,
      id: r._id,
    }));
    pagination.itemsLength = response.data.pagination.total;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const onDialogChange = (val) => {
  if (!val) Object.assign(testNotification, DEFAULT_TEST_NOTIFICATION);
};

// 👉 Delete Template
const deleteTemplate = (id, dialogCloseRef) => {
  isLoading.value = true;
  AppEngagementsStore.deleteTemplate({ id })
    .then(() => {
      fetchTemplates({ ...pagination });
      dialogCloseRef.value = false;
      show({ message: "Template deleted successfully", color: "success" });
    })
    .catch((error) => {
      show({ message: "Something went wrong", color: "error" });
    })
    .finally(() => {
      isLoading.value = false;
    });
};
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchTemplates({ ...pagination })"
          :loading="isLoading"
          variant="text"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <!-- 👉 Create -->
        <VBtn
          prepend-icon="tabler-plus"
          :to="{ name: 'admin-app-engagements-templates-add-id?' }"
        >
          Create Template
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable :headers="headers" :items="items" :loading="isLoading" 
      :server-side="true" v-bind="pagination" @update:options="onUpdateOptionsDebounced">
      <!-- code -->
      <template #item.code="{ item }">
        {{ item.raw.code }} <small>( {{ item.raw.lang }} )</small>
      </template>

      <!-- type -->
      <template #item.type="{ item }">
        {{ item.raw.type }}
        <small v-if="item.raw.type !== 'simple'"
          >( {{ item.raw.subType }} )</small
        >
      </template>

      <!-- created at -->
      <template #item.createdAt="{ item }">
        {{ smartFormatDate(item.raw.createdAt) }}
      </template>

      <!-- created at -->
      <template #item.updatedAt="{ item }">
        {{ smartFormatDate(item.raw.updatedAt) }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn>
          <VIcon icon="tabler-trash" />
          <v-dialog activator="parent" max-width="340">
            <template v-slot:default="{ isActive }">
              <v-card
                class=""
                prepend-icon="mdi-alert"
                text="Are you certain, you want to delete ?"
                title="Confirm"
              >
                <template v-slot:actions>
                  <v-btn
                    class="ml-auto"
                    text="Yes"
                    @click="deleteTemplate(item.raw._id, isActive)"
                  ></v-btn>
                  <v-btn
                    class="ml-auto"
                    text="No"
                    @click="isActive.value = false"
                  ></v-btn>
                </template>
              </v-card>
            </template>
          </v-dialog>
          <VTooltip activator="parent">Delete</VTooltip>
        </IconBtn>

        <IconBtn
          :to="{
            name: 'admin-app-engagements-templates-add-id?',
            params: { id: item.raw._id },
          }"
        >
          <VIcon icon="mdi-pencil-outline" />
          <VTooltip activator="parent">Edit</VTooltip>
        </IconBtn>

        <IconBtn
          :to="{
            name: 'admin-app-engagements-templates-add-id?',
            query: { t_copy: item.raw._id },
          }"
        >
          <VIcon icon="mdi-content-copy" />
          <VTooltip activator="parent">Duplicate</VTooltip>
        </IconBtn>

        <IconBtn
          :to="{
            name: 'admin-app-engagements-campaigns-add',
            query: { t_edit: item.raw._id },
          }"
        >
          <VIcon icon="mdi-rocket-launch-outline" />
          <VTooltip activator="parent">New Campaign</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

<style lang="scss"></style>
